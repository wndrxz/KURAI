import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Anime, SearchAnime } from "../lib/types";

const STALE_MS = 5 * 60 * 1000; // 5 minutes

interface SearchFilteredParams {
	query?: string;
	genres?: string;
	studio?: string;
	minRating?: number;
	maxRating?: number;
	movie?: boolean;
	hq?: boolean;
}

interface CatalogState {
	items: Anime[];
	searchResults: SearchAnime[];
	isSearchMode: boolean;
	page: number;
	loading: boolean;
	hasMore: boolean;
	searchQuery: string;
	lastLoadedAt: number | null;

	loadPage: () => Promise<void>;
	search: (query: string) => Promise<void>;
	searchFiltered: (params: SearchFilteredParams) => Promise<void>;
	clearSearch: () => void;
	reset: () => void;
	refresh: () => Promise<void>;
	isStale: () => boolean;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
	items: [],
	searchResults: [],
	isSearchMode: false,
	page: 0,
	loading: false,
	hasMore: true,
	searchQuery: "",
	lastLoadedAt: null,

	loadPage: async () => {
		const { page, loading, hasMore, isSearchMode } = get();
		if (loading || !hasMore || isSearchMode) return;

		set({ loading: true });
		try {
			const batch = await invoke<Anime[]>("catalog_get_all", { page });
			set((s) => ({
				items: [...s.items, ...batch],
				page: s.page + 1,
				hasMore: batch.length > 0,
				loading: false,
				lastLoadedAt: Date.now(),
			}));
		} catch {
			set({ loading: false });
		}
	},

	search: async (query) => {
		if (!query.trim()) {
			get().clearSearch();
			return;
		}
		set({ loading: true, isSearchMode: true, searchQuery: query });
		try {
			const results = await invoke<SearchAnime[]>("catalog_search", {
				query,
				page: 0,
			});
			set({ searchResults: results, loading: false });
		} catch {
			set({ searchResults: [], loading: false });
		}
	},

	searchFiltered: async (params) => {
		set({
			loading: true,
			isSearchMode: true,
			searchQuery: params.query ?? "",
		});
		try {
			const results = await invoke<SearchAnime[]>(
				"catalog_search_filtered",
				{
					params: {
						query: params.query || null,
						page: 0,
						genres: params.genres || null,
						studio: params.studio || null,
						movie: params.movie ?? null,
						hq: params.hq ?? null,
						minRating: params.minRating ?? null,
						maxRating: params.maxRating ?? null,
					},
				},
			);
			set({ searchResults: results, loading: false });
		} catch {
			set({ searchResults: [], loading: false });
		}
	},

	clearSearch: () =>
		set({
			isSearchMode: false,
			searchQuery: "",
			searchResults: [],
		}),

	reset: () =>
		set({
			items: [],
			searchResults: [],
			isSearchMode: false,
			page: 0,
			hasMore: true,
			searchQuery: "",
			lastLoadedAt: null,
		}),

	refresh: async () => {
		set({
			items: [],
			searchResults: [],
			isSearchMode: false,
			searchQuery: "",
			page: 0,
			hasMore: true,
			loading: true,
		});
		try {
			const batch = await invoke<Anime[]>("catalog_get_all", { page: 0 });
			set({
				items: batch,
				page: 1,
				hasMore: batch.length > 0,
				loading: false,
				lastLoadedAt: Date.now(),
			});
		} catch {
			set({ loading: false });
		}
	},

	isStale: () => {
		const { lastLoadedAt } = get();
		if (!lastLoadedAt) return false;
		return Date.now() - lastLoadedAt > STALE_MS;
	},
}));