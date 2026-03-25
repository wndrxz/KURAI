import { invoke } from "@tauri-apps/api/core";
import type {
	Anime,
	Series,
	QualityOption,
	StartWatchData,
	WatchEntry,
	Collection,
	SkipMark,
} from "../lib/types";

export function useAnimix() {
	const getAnime = (id: number) =>
		invoke<Anime>("catalog_get", { id });

	const getSeries = (animeId: number) =>
		invoke<Record<string, Series[]>>("get_series", { animeId });

	const getQualities = (animeId: number, season: number, episode: number) =>
		invoke<QualityOption[]>("get_qualities", { animeId, season, episode });

	const resolveVideo = (privateId: string) =>
		invoke<string>("resolve_video", { privateId });

	const getAnimeThumb = (animeId: number) =>
		invoke<string | null>("get_anime_thumb", { animeId });

	const startWatch = (seriesId: number) =>
		invoke<StartWatchData>("start_watch", { seriesId });

	const endWatch = (seriesId: number, timeSec: number) =>
		invoke("end_watch", { seriesId, timeSec });

	const getLastWatch = () =>
		invoke<WatchEntry[]>("get_last_watch");

	const getCollections = () =>
		invoke<Collection[]>("get_collections");

	const getSkipMarks = (
		animeId: number,
		season: number,
		episode: number,
	) => invoke<SkipMark[]>("get_skip_marks", { animeId, season, episode });

	return {
		getAnime,
		getSeries,
		getQualities,
		resolveVideo,
		getAnimeThumb,
		startWatch,
		endWatch,
		getLastWatch,
		getCollections,
		getSkipMarks,
	};
}