import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useCatalogStore } from "../stores/catalog";
import { animeToDisplay, searchAnimeToDisplay } from "../lib/types";
import { AnimeGrid } from "../components/anime-grid";
import { SearchBar } from "../components/search-bar";
import {
	FilterPanel,
	type FilterValues,
	emptyFilters,
	hasActiveFilters,
} from "../components/filter-panel";
import { GridSkeleton } from "../components/skeleton";

export default function CatalogPage() {
	const {
		items,
		searchResults,
		isSearchMode,
		loading,
		hasMore,
		searchQuery,
		loadPage,
		searchFiltered,
		clearSearch,
		refresh,
		isStale,
	} = useCatalogStore();

	const [filters, setFilters] = useState<FilterValues>({ ...emptyFilters });
	const sentinelRef = useRef<HTMLDivElement>(null);

	// Initial load OR auto-refresh if stale
	// biome-ignore lint/correctness/useExhaustiveDependencies: mount only
	useEffect(() => {
		if (isSearchMode) return;

		if (items.length === 0) {
			loadPage();
		} else if (isStale()) {
			refresh();
		}
	}, []);

	// Infinite scroll
	useEffect(() => {
		if (isSearchMode || !hasMore || loading) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) loadPage();
			},
			{ rootMargin: "400px" },
		);

		const el = sentinelRef.current;
		if (el) observer.observe(el);
		return () => observer.disconnect();
	}, [isSearchMode, hasMore, loading, loadPage]);

	const doSearch = (query: string, f: FilterValues = filters) => {
		if (!query.trim() && !hasActiveFilters(f)) {
			clearSearch();
			return;
		}
		searchFiltered({
			query: query || undefined,
			genres: f.genres.length > 0 ? f.genres.join(",") : undefined,
			studio: f.studio || undefined,
			minRating: f.minRating ?? undefined,
			maxRating: f.maxRating ?? undefined,
			movie: f.movie ?? undefined,
			hq: f.hq ?? undefined,
		});
	};

	const handleSearch = (query: string) => doSearch(query, filters);
	const handleApply = () => doSearch(searchQuery, filters);

	const handleRefresh = () => {
		clearSearch();
		setFilters({ ...emptyFilters });
		refresh();
	};

	const displayItems = isSearchMode
		? searchResults.map(searchAnimeToDisplay)
		: items.map(animeToDisplay);

	return (
		<div className="flex flex-col gap-4">
			{/* Search + refresh */}
			<div className="flex items-center gap-2">
				<div className="flex-1">
					<SearchBar value={searchQuery} onChange={handleSearch} />
				</div>
				<button
					type="button"
					onClick={handleRefresh}
					disabled={loading}
					title="Обновить каталог"
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-card text-text-muted transition-default hover:bg-bg-hover hover:text-text-secondary disabled:opacity-50"
				>
					<RefreshCw
						size={15}
						className={loading ? "animate-spin" : ""}
					/>
				</button>
			</div>

			<FilterPanel
				values={filters}
				onChange={setFilters}
				onApply={handleApply}
			/>

			{displayItems.length > 0 && <AnimeGrid items={displayItems} />}

			{loading && <GridSkeleton count={12} />}

			{!loading && displayItems.length === 0 && (
				<div className="flex flex-col items-center justify-center py-20 text-center">
					<p className="text-lg text-text-secondary">
						{isSearchMode ? "Ничего не найдено" : "Каталог пуст"}
					</p>
					{isSearchMode && (
						<p className="text-sm text-text-muted">
							Попробуйте другой запрос или фильтры
						</p>
					)}
				</div>
			)}

			{!isSearchMode && hasMore && (
				<div ref={sentinelRef} className="h-10" />
			)}
		</div>
	);
}