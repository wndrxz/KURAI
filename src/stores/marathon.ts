import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { MarathonConfigData } from "../components/marathon-config";

export interface QueueItem {
	id: number;
	animeId: number;
	animeTitle: string;
	totalEpisodes: number;
	startEp: number;
	endEp: number | null;
	currentEp: number;
	currentSeason: number;
	status: string;
	position: number;
	farmedCount: number;
}

export interface MarathonStatus {
	active: boolean;
	paused: boolean;
	infinite: boolean;
	onBreak: boolean;
	breakEndsAt: number | null;
	currentAnime: string | null;
	currentEpisode: number | null;
	currentSeason: number | null;
	totalFarmed: number;
	sessionStartedAt: number | null;
	queueRemaining: number;
	episodesPerHour: number;
}

export interface SessionInfo {
	id: number;
	startedAt: number;
	endedAt: number | null;
	totalEpisodes: number;
	totalSeconds: number;
	status: string;
}

const defaultStatus: MarathonStatus = {
	active: false,
	paused: false,
	infinite: false,
	onBreak: false,
	breakEndsAt: null,
	currentAnime: null,
	currentEpisode: null,
	currentSeason: null,
	totalFarmed: 0,
	sessionStartedAt: null,
	queueRemaining: 0,
	episodesPerHour: 0,
};

interface MarathonState {
	queue: QueueItem[];
	status: MarathonStatus;
	sessions: SessionInfo[];
	isStarting: boolean;

	loadQueue: () => Promise<void>;
	loadStatus: () => Promise<void>;
	loadSessions: () => Promise<void>;

	addToQueue: (
		animeId: number,
		title: string,
		totalEps: number,
		startEp: number,
		endEp?: number,
	) => Promise<void>;
	removeFromQueue: (id: number) => Promise<void>;
	reorder: (id: number, newPosition: number) => Promise<void>;

	start: (headless: boolean, preset?: string) => Promise<void>;
	startCustom: (config: MarathonConfigData, headless: boolean) => Promise<void>;
	stop: () => Promise<void>;
	pause: () => Promise<void>;
	resume: () => Promise<void>;
	skip: () => Promise<void>;
	episodeDone: (seriesId: number) => Promise<void>;
	resetErrors: () => Promise<void>;

	setStatus: (s: MarathonStatus) => void;
}

export const useMarathonStore = create<MarathonState>((set, get) => ({
	queue: [],
	status: defaultStatus,
	sessions: [],
	isStarting: false,

	loadQueue: async () => {
		try {
			const queue = await invoke<QueueItem[]>("marathon_get_queue");
			set({ queue });
		} catch (e) {
			console.error("Failed to load queue:", e);
		}
	},

	loadStatus: async () => {
		try {
			const status = await invoke<MarathonStatus>("marathon_get_status");
			set({ status });
		} catch (e) {
			console.error("Failed to load status:", e);
		}
	},

	loadSessions: async () => {
		try {
			const sessions = await invoke<SessionInfo[]>("marathon_get_sessions", {
				limit: 20,
			});
			set({ sessions });
		} catch (e) {
			console.error("Failed to load sessions:", e);
		}
	},

	addToQueue: async (animeId, title, totalEps, startEp, endEp) => {
		await invoke("marathon_add", {
			animeId,
			animeTitle: title,
			totalEpisodes: totalEps,
			startEp,
			endEp: endEp ?? null,
		});
		get().loadQueue();
	},

	removeFromQueue: async (id) => {
		await invoke("marathon_remove", { id });
		get().loadQueue();
	},

	reorder: async (id, newPosition) => {
		await invoke("marathon_reorder", { id, newPosition });
		get().loadQueue();
	},

	start: async (headless, preset) => {
		set({ isStarting: true });
		try {
			await invoke("marathon_start", { headless, preset: preset ?? null });
			await get().loadStatus();
		} finally {
			set({ isStarting: false });
		}
	},

	startCustom: async (config, headless) => {
		set({ isStarting: true });
		try {
			await invoke("marathon_start_custom", { config, headless });
			await get().loadStatus();
		} finally {
			set({ isStarting: false });
		}
	},

	stop: async () => {
		await invoke("marathon_stop");
	},

	pause: async () => {
		await invoke("marathon_pause");
	},

	resume: async () => {
		await invoke("marathon_resume");
	},

	skip: async () => {
		await invoke("marathon_skip");
	},

	episodeDone: async (seriesId) => {
		await invoke("marathon_episode_done", { seriesId });
	},

	resetErrors: async () => {
		await invoke("marathon_reset_errors");
		get().loadQueue();
	},

	setStatus: (status) => set({ status }),
}));