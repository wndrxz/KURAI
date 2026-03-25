import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  usePlayerStore,
  type SkipMark,
  type SeriesItem,
  type QualityOption,
} from "../stores/player";
import { useSettingsStore } from "../stores/settings";
import { useMarathonStore } from "../stores/marathon"; // ← ДОБАВЛЕНО
import {
  PROGRESS_SAVE_INTERVAL,
  CONTROLS_HIDE_DELAY,
  NEXT_EP_TRIGGER,
} from "../lib/constants";

export function usePlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Stable refs ──
  const seriesIdRef = useRef<number | null>(null);
  const watchStartedRef = useRef(false);
  const watchStartTimeRef = useRef(0);
  const curTimeRef = useRef(0);
  const handledMarksRef = useRef(new Set<number>());
  const activeMarkRef = useRef<SkipMark | null>(null);
  const nextShownRef = useRef(false);
  const nextCancelledRef = useRef(false);
  const qualSwitchPosRef = useRef<number | null>(null);

  // ── Timers ──
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const ctrlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Local UI state ──
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [paused, setPaused] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [activeMark, setActiveMark] = useState<SkipMark | null>(null);
  const [showNextEp, setShowNextEp] = useState(false);
  const [nextEpCountdown, setNextEpCountdown] = useState(0);
  const [qualities, setQualities] = useState<QualityOption[]>([]);

  // ── Store subscriptions ──
  const animeId = usePlayerStore((s) => s.animeId);
  const animeTitle = usePlayerStore((s) => s.animeTitle);
  const season = usePlayerStore((s) => s.season);
  const episode = usePlayerStore((s) => s.episode);
  const seriesId = usePlayerStore((s) => s.seriesId);
  const privateId = usePlayerStore((s) => s.privateId);
  const quality = usePlayerStore((s) => s.quality);
  const videoUrl = usePlayerStore((s) => s.videoUrl);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const error = usePlayerStore((s) => s.error);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const allSeasons = usePlayerStore((s) => s.allSeasons);
  const marathonMode = usePlayerStore((s) => s.marathonMode); // ← ДОБАВЛЕНО

  useEffect(() => {
    seriesIdRef.current = seriesId;
  }, [seriesId]);

  // ═══════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════

  useEffect(() => {
    if (!privateId || !isPlaying) return;
    let cancelled = false;
    usePlayerStore.getState().setLoading(true);

    invoke<string>("resolve_video", { privateId })
      .then((url) => {
        if (!cancelled) usePlayerStore.getState().setVideoUrl(url);
      })
      .catch((e) => {
        if (!cancelled) usePlayerStore.getState().setError(String(e));
      });

    return () => {
      cancelled = true;
    };
  }, [privateId, isPlaying]);

  useEffect(() => {
    if (!animeId || !isPlaying) return;
    let cancelled = false;

    invoke<SkipMark[]>("get_skip_marks", { animeId, season, episode })
      .then((marks) => {
        if (!cancelled) {
          usePlayerStore.getState().setSkipMarks(marks);
          handledMarksRef.current.clear();
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [animeId, season, episode, isPlaying]);

  useEffect(() => {
    if (!animeId || allSeasons || !isPlaying) return;
    let cancelled = false;

    invoke<Record<string, SeriesItem[]>>("get_series", { animeId })
      .then((s) => {
        if (!cancelled) usePlayerStore.getState().setAllSeasons(s);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [animeId, isPlaying, allSeasons]);

  useEffect(() => {
    if (!animeId || !isPlaying) return;
    let cancelled = false;

    invoke<QualityOption[]>("get_qualities", { animeId, season, episode })
      .then((q) => {
        if (!cancelled) setQualities(q);
      })
      .catch(() => setQualities([]));

    return () => {
      cancelled = true;
    };
  }, [animeId, season, episode, isPlaying]);

  // ═══════════════════════════════════════
  // EPISODE RESET
  // ═══════════════════════════════════════

  // biome-ignore lint/correctness/useExhaustiveDependencies: seriesId is a trigger for reset, not read inside
  useEffect(() => {
    watchStartedRef.current = false;
    watchStartTimeRef.current = 0;
    handledMarksRef.current.clear();
    activeMarkRef.current = null;
    nextShownRef.current = false;
    nextCancelledRef.current = false;
    setPaused(true);
    setActiveMark(null);
    setShowNextEp(false);
    setNextEpCountdown(0);
    if (skipTimer.current) clearTimeout(skipTimer.current);
    if (nextTimer.current) clearInterval(nextTimer.current);
  }, [seriesId]);

  // ═══════════════════════════════════════
  // endWatch — safe, 413-protected
  // ═══════════════════════════════════════

  const sendEndWatch = useCallback(
    async (overrideSid?: number, overrideTime?: number) => {
      const sid = overrideSid ?? seriesIdRef.current;
      if (!sid || !watchStartedRef.current) return;

      const time = overrideTime ?? curTimeRef.current;
      const elapsed = (Date.now() - watchStartTimeRef.current) / 1000;
      const safe = Math.max(
        1,
        Math.min(Math.floor(time), Math.floor(elapsed * 0.95)),
      );

      try {
        await invoke("end_watch", { seriesId: sid, timeSec: safe });
      } catch (err) {
        if (String(err).includes("413")) {
          const retry = Math.max(1, Math.floor(safe * 0.7));
          try {
            await invoke("end_watch", {
              seriesId: sid,
              timeSec: retry,
            });
          } catch {
            /* give up */
          }
        }
      }
    },
    [],
  );

  // ═══════════════════════════════════════
  // PERIODIC PROGRESS SAVE
  // ═══════════════════════════════════════

  useEffect(() => {
    if (!isPlaying) return;

    saveTimer.current = setInterval(() => {
      if (
        seriesIdRef.current &&
        watchStartedRef.current &&
        curTimeRef.current > 5
      ) {
        sendEndWatch();
      }
    }, PROGRESS_SAVE_INTERVAL);

    return () => {
      if (saveTimer.current) clearInterval(saveTimer.current);
    };
  }, [isPlaying, sendEndWatch]);

  // ═══════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════

  const getAdjacent = useCallback(
    (dir: "next" | "prev"): SeriesItem | null => {
      const {
        allSeasons: ss,
        season: sn,
        episode: ep,
      } = usePlayerStore.getState();
      if (!ss) return null;

      const keys = Object.keys(ss).sort((a, b) => +a - +b);
      const sk = String(sn);
      const si = keys.indexOf(sk);
      if (si < 0) return null;

      const eps = [...(ss[sk] || [])].sort(
        (a, b) => a.seriesNum - b.seriesNum,
      );
      const ei = eps.findIndex((e) => e.seriesNum === ep);

      if (dir === "next") {
        if (ei >= 0 && ei < eps.length - 1) return eps[ei + 1];
        if (si < keys.length - 1) {
          const n = [...(ss[keys[si + 1]] || [])].sort(
            (a, b) => a.seriesNum - b.seriesNum,
          );
          return n[0] ?? null;
        }
      } else {
        if (ei > 0) return eps[ei - 1];
        if (si > 0) {
          const p = [...(ss[keys[si - 1]] || [])].sort(
            (a, b) => a.seriesNum - b.seriesNum,
          );
          return p.at(-1) ?? null;
        }
      }
      return null;
    },
    [],
  );

  const navigateToEp = useCallback(
    async (ep: SeriesItem) => {
      await sendEndWatch();
      watchStartedRef.current = false;
      usePlayerStore
        .getState()
        .updateEpisode(
          ep.season,
          ep.seriesNum,
          ep.id,
          ep.privateId,
          ep.videoQuality,
        );
    },
    [sendEndWatch],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: allSeasons/season/episode нужны для корректной реактивности
  const hasNextEp = useMemo(
    () => !!getAdjacent("next"),
    [getAdjacent, allSeasons, season, episode],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: allSeasons/season/episode нужны для корректной реактивности
  const hasPrevEp = useMemo(
    () => !!getAdjacent("prev"),
    [getAdjacent, allSeasons, season, episode],
  );

  const goNextEp = useCallback(() => {
    const n = getAdjacent("next");
    if (n) navigateToEp(n);
  }, [getAdjacent, navigateToEp]);

  const goPrevEp = useCallback(() => {
    const p = getAdjacent("prev");
    if (p) navigateToEp(p);
  }, [getAdjacent, navigateToEp]);

  // ═══════════════════════════════════════
  // VIDEO EVENT HANDLERS
  // ═══════════════════════════════════════

  const onPlay = useCallback(async () => {
    setPaused(false);
    const sid = seriesIdRef.current;
    if (!watchStartedRef.current && sid) {
      try {
        await invoke("start_watch", { seriesId: sid });
        watchStartedRef.current = true;
        watchStartTimeRef.current = Date.now();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const onPause = useCallback(() => {
    setPaused(true);
  }, []);

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    const t = v.currentTime;
    const d = v.duration || 0;
    curTimeRef.current = t;
    setCurrentTime(t);

    if (v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1));
    }

    // ── Skip marks ──
    const marks = usePlayerStore.getState().skipMarks;
    const mode = useSettingsStore.getState().skipMode;
    const tout = useSettingsStore.getState().skipButtonTimeout;

    if (mode !== "off") {
      for (const m of marks) {
        if (handledMarksRef.current.has(m.id)) continue;
        if (t < m.startTime || t >= m.finishTime) continue;

        if (mode === "auto") {
          v.currentTime = m.finishTime + 0.5;
          handledMarksRef.current.add(m.id);
        } else if (!activeMarkRef.current) {
          activeMarkRef.current = m;
          setActiveMark(m);

          if (skipTimer.current) clearTimeout(skipTimer.current);
          skipTimer.current = setTimeout(() => {
            const vid = videoRef.current;
            if (
              vid &&
              vid.currentTime >= m.startTime &&
              vid.currentTime < m.finishTime
            ) {
              vid.currentTime = m.finishTime + 0.5;
            }
            handledMarksRef.current.add(m.id);
            activeMarkRef.current = null;
            setActiveMark(null);
          }, tout);
        }
        break;
      }

      const am = activeMarkRef.current;
      if (am && t >= am.finishTime) {
        handledMarksRef.current.add(am.id);
        activeMarkRef.current = null;
        setActiveMark(null);
        if (skipTimer.current) clearTimeout(skipTimer.current);
      }
    }

    // ── Next episode (только НЕ в marathon mode) ──           ← ИЗМЕНЕНО
    const isMarathon = usePlayerStore.getState().marathonMode;
    if (isMarathon) return; // движок марафона сам управляет    ← ДОБАВЛЕНО

    const { autoNextEpisode, nextEpCountdown: cdSetting } =
      useSettingsStore.getState();

    if (
      autoNextEpisode &&
      d > 0 &&
      d - t <= NEXT_EP_TRIGGER &&
      !nextShownRef.current &&
      !nextCancelledRef.current &&
      getAdjacent("next")
    ) {
      nextShownRef.current = true;
      setShowNextEp(true);
      setNextEpCountdown(cdSetting);

      if (nextTimer.current) clearInterval(nextTimer.current);
      nextTimer.current = setInterval(() => {
        setNextEpCountdown((prev) => {
          if (prev <= 1) {
            if (nextTimer.current) clearInterval(nextTimer.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [getAdjacent]);

  useEffect(() => {
    if (showNextEp && nextEpCountdown === 0 && nextShownRef.current) {
      nextShownRef.current = false;
      goNextEp();
    }
  }, [showNextEp, nextEpCountdown, goNextEp]);

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);

    if (qualSwitchPosRef.current !== null) {
      v.currentTime = qualSwitchPosRef.current;
      qualSwitchPosRef.current = null;
    }

    v.play().catch(() => {});
  }, []);

  // ═══════════════════════════════════════     ← ИЗМЕНЕНО
  // onEnded — marathon mode support
  // ═══════════════════════════════════════
  const onEnded = useCallback(() => {
    setPaused(true);
    sendEndWatch();

    // ── Marathon mode: сообщаем движку и выходим ──
    const isMarathon = usePlayerStore.getState().marathonMode;
    if (isMarathon) {
      const sid = usePlayerStore.getState().seriesId;
      if (sid) {
        useMarathonStore.getState().episodeDone(sid);
      }
      // НЕ показываем NextEpisodeOverlay — движок сам пришлёт следующий
      return;
    }

    // ── Обычная логика ──
    if (
      !nextShownRef.current &&
      useSettingsStore.getState().autoNextEpisode
    ) {
      const n = getAdjacent("next");
      if (n) navigateToEp(n);
    }
  }, [sendEndWatch, getAdjacent, navigateToEp]);

  const onError = useCallback(
    () =>
      usePlayerStore
        .getState()
        .setError("Ошибка воспроизведения видео"),
    [],
  );
  const onWaiting = useCallback(() => setIsBuffering(true), []);
  const onCanPlay = useCallback(() => setIsBuffering(false), []);

  const videoHandlers = useMemo(
    () => ({
      onPlay,
      onPause,
      onTimeUpdate,
      onLoadedMetadata,
      onEnded,
      onError,
      onWaiting,
      onCanPlay,
    }),
    [
      onPlay,
      onPause,
      onTimeUpdate,
      onLoadedMetadata,
      onEnded,
      onError,
      onWaiting,
      onCanPlay,
    ],
  );

  // ═══════════════════════════════════════
  // CONTROLS
  // ═══════════════════════════════════════

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play().catch(() => {}) : v.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, Math.min(time, v.duration || 0));
  }, []);

  const seekRelative = useCallback((delta: number) => {
    const v = videoRef.current;
    if (v)
      v.currentTime = Math.max(
        0,
        Math.min(v.currentTime + delta, v.duration || 0),
      );
  }, []);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    usePlayerStore.getState().setVolume(clamped);
    if (videoRef.current) videoRef.current.volume = clamped;
    if (clamped > 0 && usePlayerStore.getState().muted) {
      usePlayerStore.getState().setMuted(false);
      if (videoRef.current) videoRef.current.muted = false;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const next = !usePlayerStore.getState().muted;
    usePlayerStore.getState().setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    } else {
      await el.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () =>
      document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ═══════════════════════════════════════
  // CONTROLS VISIBILITY
  // ═══════════════════════════════════════

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
    ctrlTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false);
      }
    }, CONTROLS_HIDE_DELAY);
  }, []);

  // ═══════════════════════════════════════
  // SKIP ACTIONS
  // ═══════════════════════════════════════

  const handleSkip = useCallback(() => {
    const m = activeMarkRef.current;
    if (!m) return;
    if (videoRef.current)
      videoRef.current.currentTime = m.finishTime + 0.5;
    handledMarksRef.current.add(m.id);
    activeMarkRef.current = null;
    setActiveMark(null);
    if (skipTimer.current) clearTimeout(skipTimer.current);
  }, []);

  const handleWatch = useCallback(() => {
    const m = activeMarkRef.current;
    if (!m) return;
    handledMarksRef.current.add(m.id);
    activeMarkRef.current = null;
    setActiveMark(null);
    if (skipTimer.current) clearTimeout(skipTimer.current);
  }, []);

  // ═══════════════════════════════════════
  // NEXT EPISODE ACTIONS
  // ═══════════════════════════════════════

  const handleNextNow = useCallback(() => {
    if (nextTimer.current) clearInterval(nextTimer.current);
    nextShownRef.current = false;
    setShowNextEp(false);
    goNextEp();
  }, [goNextEp]);

  const cancelNextEp = useCallback(() => {
    if (nextTimer.current) clearInterval(nextTimer.current);
    nextShownRef.current = false;
    nextCancelledRef.current = true;
    setShowNextEp(false);
    setNextEpCountdown(0);
  }, []);

  // ═══════════════════════════════════════
  // QUALITY SWITCH
  // ═══════════════════════════════════════

  const switchQuality = useCallback(
    async (opt: QualityOption) => {
      const st = usePlayerStore.getState();
      if (opt.quality === st.quality) return;

      qualSwitchPosRef.current = curTimeRef.current;
      await sendEndWatch();
      watchStartedRef.current = false;

      st.updateEpisode(
        st.season,
        st.episode,
        opt.seriesId,
        opt.privateId,
        opt.quality,
      );
    },
    [sendEndWatch],
  );

  // ═══════════════════════════════════════
  // CLOSE
  // ═══════════════════════════════════════

  const closePlayer = useCallback(async () => {
    await sendEndWatch();
    usePlayerStore.getState().stop();
  }, [sendEndWatch]);

  // ═══════════════════════════════════════
  // SYNC & CLEANUP
  // ═══════════════════════════════════════

  // biome-ignore lint/correctness/useExhaustiveDependencies: videoUrl — триггер для переприменения настроек при смене источника
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.volume = volume;
      v.muted = muted;
    }
  }, [videoUrl, volume, muted]);

  useEffect(
    () => () => {
      sendEndWatch();
      if (saveTimer.current) clearInterval(saveTimer.current);
      if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
      if (skipTimer.current) clearTimeout(skipTimer.current);
      if (nextTimer.current) clearInterval(nextTimer.current);
    },
    [sendEndWatch],
  );

  // ═══════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════

  return {
    videoRef,
    containerRef,
    videoHandlers,

    currentTime,
    duration,
    buffered,
    paused,
    isBuffering,
    isFullscreen,
    videoUrl,
    isLoading,
    error,
    isPlaying,

    animeId,
    animeTitle,
    season,
    episode,
    quality,

    volume,
    muted,

    togglePlay,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    toggleFullscreen,
    controlsVisible,
    showControls,

    activeMark,
    handleSkip,
    handleWatch,

    showNextEp,
    nextEpCountdown,
    handleNextNow,
    cancelNextEp,

    qualities,
    switchQuality,

    hasNextEp,
    hasPrevEp,
    goNextEp,
    goPrevEp,

    closePlayer,

    marathonMode, // ← ДОБАВЛЕНО в return
  };
}