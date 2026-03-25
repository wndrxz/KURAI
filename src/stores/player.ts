import { create } from "zustand";

export interface SkipMark {
	id: number;
	animeId: number;
	season: number;
	seriesNum: number;
	label: string;
	startTime: number;
	finishTime: number;
	autoSkip: boolean;
}

export interface SeriesItem {
	id: number;
	privateId: string;
	season: number;
	seriesNum: number;
	videoQuality: string;
	[key: string]: unknown;
}

export interface QualityOption {
	seriesId: number;
	privateId: string;
	quality: string;
	label: string;
}

export interface PlaybackSetup {
	animeId: number;
	animeTitle: string;
	season: number;
	episode: number;
	seriesId: number;
	privateId: string;
	quality: string;
	marathonMode?: boolean;
}

interface PlayerState {
	animeId: number | null;
	animeTitle: string;
	season: number;
	episode: number;
	seriesId: number | null;
	privateId: string | null;
	quality: string;

	videoUrl: string | null;
	isPlaying: boolean;
	isLoading: boolean;
	error: string | null;
	volume: number;
	muted: boolean;
	marathonMode: boolean;

	skipMarks: SkipMark[];
	allSeasons: Record<string, SeriesItem[]> | null;

	setPlayback: (info: PlaybackSetup) => void;
	setVideoUrl: (url: string) => void;
	setLoading: (v: boolean) => void;
	setError: (e: string | null) => void;
	setVolume: (v: number) => void;
	setMuted: (v: boolean) => void;
	setSkipMarks: (m: SkipMark[]) => void;
	setAllSeasons: (s: Record<string, SeriesItem[]>) => void;
	updateEpisode: (
		season: number,
		episode: number,
		seriesId: number,
		privateId: string,
		quality: string,
	) => void;
	stop: () => void;
}

const initial = {
	animeId: null as number | null,
	animeTitle: "",
	season: 1,
	episode: 1,
	seriesId: null as number | null,
	privateId: null as string | null,
	quality: "FULL_HD",
	videoUrl: null as string | null,
	isPlaying: false,
	isLoading: false,
	error: null as string | null,
	volume: 1,
	muted: false,
	marathonMode: false,
	skipMarks: [] as SkipMark[],
	allSeasons: null as Record<string, SeriesItem[]> | null,
};

export const usePlayerStore = create<PlayerState>((set) => ({
	...initial,

	setPlayback: (info) =>
		set({
			animeId: info.animeId,
			animeTitle: info.animeTitle,
			season: info.season,
			episode: info.episode,
			seriesId: info.seriesId,
			privateId: info.privateId,
			quality: info.quality,
			marathonMode: info.marathonMode ?? false,
			videoUrl: null,
			isPlaying: true,
			isLoading: true,
			error: null,
			skipMarks: [],
		}),

	setVideoUrl: (url) => set({ videoUrl: url, isLoading: false }),
	setLoading: (isLoading) => set({ isLoading }),
	setError: (error) => set({ error, isLoading: false }),
	setVolume: (volume) => set({ volume }),
	setMuted: (muted) => set({ muted }),
	setSkipMarks: (skipMarks) => set({ skipMarks }),
	setAllSeasons: (allSeasons) => set({ allSeasons }),

	updateEpisode: (season, episode, seriesId, privateId, quality) =>
		set({
			season,
			episode,
			seriesId,
			privateId,
			quality,
			videoUrl: null,
			isLoading: true,
			error: null,
			skipMarks: [],
		}),

	stop: () => set({ ...initial }),
}));