const SHIKIMORI_API = "https://shikimori.one/api/animes";
const SHIKIMORI_BASE = "https://shikimori.one";
const CACHE_KEY = "shiki_v3";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHE = 600;
const RATE_MS = 500; // 2 req/sec max
const BACKOFF_MS = 6000; // пауза при 429

// ── Cache ──

interface CacheEntry {
	url: string | null;
	ts: number;
}

const mem = new Map<string, string | null>();

function readCache(): Record<string, CacheEntry> {
	try {
		return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
	} catch {
		return {};
	}
}

function writeCache(name: string, url: string | null) {
	mem.set(name, url);
	try {
		const cache = readCache();
		cache[name] = { url, ts: Date.now() };
		const entries = Object.entries(cache);
		if (entries.length > MAX_CACHE) {
			entries.sort((a, b) => b[1].ts - a[1].ts);
			localStorage.setItem(
				CACHE_KEY,
				JSON.stringify(Object.fromEntries(entries.slice(0, MAX_CACHE))),
			);
		} else {
			localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
		}
	} catch {
		/* storage full */
	}
}

/**
 * string = cached URL, null = checked but not found, undefined = not cached
 */
export function getCachedCover(name: string): string | null | undefined {
	const m = mem.get(name);
	if (m !== undefined) return m;

	const entry = readCache()[name];
	if (entry && Date.now() - entry.ts < CACHE_TTL) {
		mem.set(name, entry.url);
		return entry.url;
	}
	return undefined;
}

// ── Rate-limited Queue ──

type QueueItem = {
	name: string;
	resolve: (url: string | null) => void;
};

const queue: QueueItem[] = [];
let processing = false;
const pending = new Map<string, Promise<string | null>>();

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

export function fetchCover(name: string): Promise<string | null> {
	// 1. instant cache hit
	const cached = getCachedCover(name);
	if (cached !== undefined) return Promise.resolve(cached);

	// 2. already queued/in-flight → reuse promise
	const existing = pending.get(name);
	if (existing) return existing;

	// 3. enqueue
	const promise = new Promise<string | null>((resolve) => {
		queue.push({ name, resolve });
		pump();
	});

	pending.set(name, promise);
	promise.finally(() => pending.delete(name));
	return promise;
}

async function pump() {
	if (processing) return;
	processing = true;

	while (queue.length > 0) {
		const item = queue.shift();
		if (!item) break;

		// re-check cache (may have loaded while queued)
		const cached = getCachedCover(item.name);
		if (cached !== undefined) {
			item.resolve(cached);
			continue;
		}

		const url = await doFetch(item.name);
		item.resolve(url);

		// rate limit between requests
		if (queue.length > 0) {
			await sleep(RATE_MS);
		}
	}

	processing = false;
}

async function doFetch(name: string): Promise<string | null> {
	const url = `${SHIKIMORI_API}?search=${encodeURIComponent(name)}&limit=1`;

	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const resp = await fetch(url, {
				headers: { Accept: "application/json" },
			});

			if (resp.status === 429) {
				// back off and retry once
				await sleep(BACKOFF_MS);
				continue;
			}

			if (!resp.ok) {
				writeCache(name, null);
				return null;
			}

			const data = await resp.json();

			if (
				Array.isArray(data) &&
				data.length > 0 &&
				data[0]?.image?.original
			) {
				const coverUrl = `${SHIKIMORI_BASE}${data[0].image.original}`;
				writeCache(name, coverUrl);
				return coverUrl;
			}

			writeCache(name, null);
			return null;
		} catch {
			// network error, don't cache — may work later
			return null;
		}
	}

	writeCache(name, null);
	return null;
}