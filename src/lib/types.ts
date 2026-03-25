// ═══════════════════════════════════════
// API types (camelCase from Rust serde)
// ═══════════════════════════════════════

export interface Anime {
	id: number;
	thumb: string | null;
	name: string;
	description: string;
	productionDates: string;
	genres: string;
	blacklistedCountries: string;
	pg: number;
	rating: number;
	userRating: number;
	available: boolean;
	createdAt: number;
	updatedAt: number;
	announce: string;
	studio: string | null;
	movie: boolean | null;
	hq: boolean | null;
	watchCount: number;
	viral: number;
	subscribed: boolean;
}

export interface SearchAnime {
	id: number;
	name: string;
	genres: string[];
	studio: string | null;
	available: boolean;
	movie: boolean | null;
	hq: boolean | null;
	rating: number;
	viral: number;
}

export interface Series {
	id: number;
	privateId: string;
	thumb: string | null;
	animeId: number;
	season: number;
	seriesNum: number;
	uploadedAt: number;
	uploadedBy: number;
	size: number;
	status: number;
	processingPriority: number;
	videoQuality: string;
	notifyEncoded: boolean;
}

export interface QualityOption {
	seriesId: number;
	privateId: string;
	quality: string;
	label: string;
}

export interface StartWatchData {
	startTime: number;
	seriesId: number;
}

export interface WatchEntry {
	privateVideoId: string;
	animeName: string;
	animeId: number;
	seriesId: number;
	timeSec: number;
	season: number;
	series: number;
	watched: boolean;
}

export interface SeriesWatchEntry {
	id: number;
	watchedTimeSec: number;
	animeId: number;
	seriesId: number;
	userId: number;
	seenTime: number;
	watched: boolean;
}

export interface Collection {
	id: number;
	animeIds: number[];
	name: string;
	userId: number;
	system: boolean;
	animeList: Anime[];
}

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

export interface Recommendations {
	NEURAL?: Anime[] | null;
	VIRAL?: Anime[] | null;
	USER_RATING?: Anime[] | null;
	RATING?: Anime[] | null;
	CATEGORY?: RecCategory | null;
	REVIEW?: RecReview | null;
}

export interface RecCategory {
	id: number;
	name: string;
	animeIds: number[];
	animeList: Anime[];
}

export interface RecReview {
	animeEntity: Anime | null;
	reviewEntity: ReviewEntry | null;
}

export interface ReviewEntry {
	id: number;
	userId: number;
	animeId: number;
	message: string;
	stars: number;
	date: number;
}

export interface Category {
	id: number;
	animeIds: number[];
	name: string;
	priority: number;
	available: boolean;
	animeList: Anime[];
}

export interface Notification {
	id: number;
	userId: number;
	date: number;
	message: string;
	url: string;
	type: string;
}

// ═══════════════════════════════════════
// Display types (unified for cards)
// ═══════════════════════════════════════

export interface DisplayAnime {
	id: number;
	name: string;
	rating: number;
	genres: string[];
	studio: string | null;
}

// ═══════════════════════════════════════
// Converters
// ═══════════════════════════════════════

export function animeToDisplay(a: Anime): DisplayAnime {
	return {
		id: a.id,
		name: a.name,
		rating: a.rating,
		genres: a.genres
			? a.genres
					.split(",")
					.map((g) => g.trim())
					.filter(Boolean)
			: [],
		studio: a.studio ?? null,
	};
}

export function searchAnimeToDisplay(sa: SearchAnime): DisplayAnime {
	return {
		id: sa.id,
		name: sa.name,
		rating: sa.rating,
		genres: sa.genres,
		studio: sa.studio ?? null,
	};
}