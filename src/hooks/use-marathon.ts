import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useMarathonStore, type MarathonStatus } from "../stores/marathon";
import { usePlayerStore } from "../stores/player";

interface PlayEpisodeEvent {
	animeId: number;
	animeTitle: string;
	season: number;
	episode: number;
	seriesId: number;
	privateId: string;
}

interface EpisodeDoneEvent {
	animeTitle: string;
	episode: number;
	season: number;
}

interface MarathonErrorEvent {
	message: string;
	will_retry: boolean;
}

interface MarathonCompleteEvent {
	totalEpisodes: number;
	totalTimeSec: number;
}

/**
 * Listens to marathon engine events from Rust.
 * Must be mounted once in app-shell.tsx so it works on every page.
 *
 * Handles:
 * - marathon:status       → updates marathon store
 * - marathon:play-episode → opens player in marathon mode (normal mode only)
 * - marathon:episode-done → refreshes queue
 * - marathon:error        → logs error (connect to toast)
 * - marathon:complete     → refreshes queue + sessions
 */
export function useMarathonEvents() {
	const setStatus = useMarathonStore((s) => s.setStatus);
	const loadQueue = useMarathonStore((s) => s.loadQueue);
	const loadSessions = useMarathonStore((s) => s.loadSessions);

	useEffect(() => {
		const cleanups: Array<() => void> = [];

		async function setup() {
			cleanups.push(
				await listen<MarathonStatus>("marathon:status", (e) => {
					setStatus(e.payload);
				}),
			);

			cleanups.push(
				await listen<PlayEpisodeEvent>("marathon:play-episode", (e) => {
					const d = e.payload;
					usePlayerStore.getState().setPlayback({
						animeId: d.animeId,
						animeTitle: d.animeTitle,
						season: d.season,
						episode: d.episode,
						seriesId: d.seriesId,
						privateId: d.privateId,
						quality: "FULL_HD",
						marathonMode: true,
					});
				}),
			);

			cleanups.push(
				await listen<EpisodeDoneEvent>("marathon:episode-done", (e) => {
					const d = e.payload;
					console.log(
						`[Marathon] Done: ${d.animeTitle} S${d.season}E${d.episode}`,
					);
					loadQueue();
				}),
			);

			cleanups.push(
				await listen<MarathonErrorEvent>("marathon:error", (e) => {
					const d = e.payload;
					console.error(
						`[Marathon] Error: ${d.message} (retry: ${d.will_retry})`,
					);
					// TODO: toast.error(d.message)
				}),
			);

			cleanups.push(
				await listen<MarathonCompleteEvent>("marathon:complete", (e) => {
					const d = e.payload;
					console.log(
						`[Marathon] Complete: ${d.totalEpisodes} eps in ${d.totalTimeSec}s`,
					);
					loadQueue();
					loadSessions();
					// TODO: toast.success(`Марафон завершён! ${d.totalEpisodes} эпизодов`)
				}),
			);
		}

		setup();
		return () => {
    for (const fn of cleanups) {
        fn();
    }
};
	}, [setStatus, loadQueue, loadSessions]);
}