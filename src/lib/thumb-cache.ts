import { invoke } from "@tauri-apps/api/core";

const cache = new Map<number, string>();
const pending = new Map<number, Promise<string | null>>();

export async function getThumb(animeId: number): Promise<string | null> {
	const cached = cache.get(animeId);
	if (cached) return cached;

	const inflight = pending.get(animeId);
	if (inflight) return inflight;

	const promise = invoke<string | null>("get_anime_thumb", { animeId })
		.then((result) => {
			if (result) cache.set(animeId, result);
			pending.delete(animeId);
			return result;
		})
		.catch(() => {
			pending.delete(animeId);
			return null;
		});

	pending.set(animeId, promise);
	return promise;
}

export function getCachedThumb(animeId: number): string | undefined {
	return cache.get(animeId);
}