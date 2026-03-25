import { useRef, useCallback, useMemo } from "react";
import { Loader2, Play, X, AlertCircle } from "lucide-react";
import { usePlayer } from "../hooks/use-player";
import { useKeyboard } from "../hooks/use-keyboard";
import { usePlayerStore } from "../stores/player";
import { PlayerControls } from "./player-controls";
import { SkipOverlay } from "./skip-overlay";
import { NextEpisodeOverlay } from "./next-episode-overlay";
import {
  SEEK_STEP,
  SEEK_STEP_LARGE,
  VOLUME_STEP,
} from "../lib/constants";

export function PlayerOverlay() {
  const p = usePlayer();
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ═══════════════════════════════════════
  // CLICK: single = play/pause, double = fullscreen
  // ═══════════════════════════════════════

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-player-ui]")) return;

      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
        p.toggleFullscreen();
      } else {
        clickTimer.current = setTimeout(() => {
          clickTimer.current = null;
          p.togglePlay();
        }, 200);
      }
    },
    [p.togglePlay, p.toggleFullscreen],
  );

  // ═══════════════════════════════════════
  // KEYBOARD
  // ═══════════════════════════════════════

  const keyHandlers = useMemo((): Record<string, () => void> => {
    if (!p.isPlaying) return {};
    return {
      " ": () => p.togglePlay(),
      ArrowLeft: () => p.seekRelative(-SEEK_STEP),
      ArrowRight: () => p.seekRelative(SEEK_STEP),
      "Shift+ArrowLeft": () => p.seekRelative(-SEEK_STEP_LARGE),
      "Shift+ArrowRight": () => p.seekRelative(SEEK_STEP_LARGE),
      ArrowUp: () => {
        const vol = usePlayerStore.getState().volume;
        p.setVolume(vol + VOLUME_STEP);
      },
      ArrowDown: () => {
        const vol = usePlayerStore.getState().volume;
        p.setVolume(vol - VOLUME_STEP);
      },
      m: () => p.toggleMute(),
      M: () => p.toggleMute(),
      f: () => p.toggleFullscreen(),
      F: () => p.toggleFullscreen(),
      n: () => p.goNextEp(),
      N: () => p.goNextEp(),
      p: () => p.goPrevEp(),
      P: () => p.goPrevEp(),
      s: () => p.handleSkip(),
      S: () => p.handleSkip(),
      Escape: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          p.closePlayer();
        }
      },
    };
  }, [
    p.isPlaying,
    p.togglePlay,
    p.seekRelative,
    p.setVolume,
    p.toggleMute,
    p.toggleFullscreen,
    p.goNextEp,
    p.goPrevEp,
    p.handleSkip,
    p.closePlayer,
  ]);

  useKeyboard(keyHandlers);

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════

  if (!p.isPlaying) return null;

  const showUI = p.controlsVisible || p.paused;

  return (
    <div
      ref={p.containerRef}
      className="fixed inset-0 z-50"
      onMouseMove={p.showControls}
      onClick={handleClick}
      onKeyDown={() => {}}
      onContextMenu={(e) => e.preventDefault()}
      style={{ cursor: showUI ? "default" : "none" }}
    >
      {/* ── Video ── */}
      {p.videoUrl && !p.error && (
        <video
          ref={p.videoRef}
          src={p.videoUrl}
          className="h-full w-full object-contain"
          playsInline
          {...p.videoHandlers}
        />
      )}

      {/* ── Loading spinner ── */}
      {(p.isLoading || p.isBuffering) && !p.error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2
            size={48}
            className="animate-spin text-white/80"
          />
        </div>
      )}

      {/* ── Error state ── */}
      {p.error && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          data-player-ui
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <AlertCircle size={48} className="text-error" />
          <p className="max-w-sm text-center text-sm text-white/80">
            {p.error}
          </p>
          <button
            type="button"
            onClick={p.closePlayer}
            className="rounded-lg bg-white/10 px-5 py-2 text-sm text-white transition-default hover:bg-white/20"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* ── Center play icon when paused ── */}
      {p.paused && !p.isLoading && !p.error && p.videoUrl && (
        <div className="animate-fade-in pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/40 p-5 backdrop-blur-sm">
            <Play
              size={36}
              className="ml-1 fill-white text-white"
            />
          </div>
        </div>
      )}

      {/* ── Top bar: title + close ── */}
      <div
        className={`absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-5 pt-4 pb-16 transition-opacity duration-200 ${
          showUI
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        data-player-ui
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-medium text-white">
              {p.animeTitle}
            </h2>
            <p className="text-xs text-white/50">
              {/* ── В marathon mode показываем индикатор ── */}
              {p.marathonMode && (                              // ← ДОБАВЛЕНО
                <span className="mr-2 text-purple-400">▶ Марафон</span>
              )}
              Сезон {p.season}, Эпизод {p.episode}
            </p>
          </div>
          <button
            type="button"
            onClick={p.closePlayer}
            aria-label="Закрыть плеер"
            className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 transition-default hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── Bottom: controls ── */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-16 transition-opacity duration-200 ${
          showUI
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        data-player-ui
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <PlayerControls
          currentTime={p.currentTime}
          duration={p.duration}
          buffered={p.buffered}
          paused={p.paused}
          volume={p.volume}
          muted={p.muted}
          isFullscreen={p.isFullscreen}
          quality={p.quality}
          qualities={p.qualities}
          hasNext={p.hasNextEp}
          hasPrev={p.hasPrevEp}
          onTogglePlay={p.togglePlay}
          onSeek={p.seek}
          onSetVolume={p.setVolume}
          onToggleMute={p.toggleMute}
          onToggleFullscreen={p.toggleFullscreen}
          onSwitchQuality={p.switchQuality}
          onNext={p.goNextEp}
          onPrev={p.goPrevEp}
        />
      </div>

      {/* ── Skip mark overlay (above controls) ── */}
      {p.activeMark && (
        <div
          className="absolute right-6 bottom-28"
          data-player-ui
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <SkipOverlay
            mark={p.activeMark}
            onSkip={p.handleSkip}
            onWatch={p.handleWatch}
          />
        </div>
      )}

      {/* ── Next episode overlay (НЕ в marathon mode) ── */}
      {p.showNextEp && !p.marathonMode && (                    // ← ИЗМЕНЕНО
        <div
          className="absolute right-6 bottom-28"
          data-player-ui
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <NextEpisodeOverlay
            countdown={p.nextEpCountdown}
            onNext={p.handleNextNow}
            onCancel={p.cancelNextEp}
          />
        </div>
      )}
    </div>
  );
}