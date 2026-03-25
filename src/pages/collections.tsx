import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router";
import { useTranslation, COLLECTION_I18N } from "../lib/i18n";
import { FolderOpen, Star, Loader2 } from "lucide-react";

interface Collection {
	id: number;
	animeIds: number[];
	name: string;
	userId: number;
	system: boolean;
	animeList: unknown[];
}

interface Anime {
	id: number;
	name: string;
	genres: string;
	rating: number;
	studio: string | null;
}

const SYSTEM_ORDER = [
	"В процессе",
	"В планах",
	"Просмотрено",
	"Отложено",
	"Брошено",
];

const PAGE_SIZE = 12;

export default function CollectionsPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const [collections, setCollections] = useState<Collection[]>([]);
	const [activeTab, setActiveTab] = useState<number | null>(null);
	const [animeList, setAnimeList] = useState<Anime[]>([]);
	const [loadingCollections, setLoadingCollections] = useState(true);
	const [loadingAnime, setLoadingAnime] = useState(false);
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

	// Load collections
	useEffect(() => {
		(async () => {
			setLoadingCollections(true);
			try {
				const data =
					await invoke<Collection[]>("get_collections");

				// Sort system collections by predefined order
				const sorted = data
					.filter((c) => c.system)
					.sort((a, b) => {
						const ia = SYSTEM_ORDER.indexOf(a.name);
						const ib = SYSTEM_ORDER.indexOf(b.name);
						return (
							(ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
						);
					});

				// Append custom collections
				const custom = data.filter((c) => !c.system);
				const all = [...sorted, ...custom];

				setCollections(all);
				if (all.length > 0) setActiveTab(all[0].id);
			} catch {
				/* empty */
			} finally {
				setLoadingCollections(false);
			}
		})();
	}, []);

	// Load anime for active tab
	useEffect(() => {
		if (activeTab === null) return;
		const col = collections.find((c) => c.id === activeTab);
		if (!col || col.animeIds.length === 0) {
			setAnimeList([]);
			return;
		}

		setLoadingAnime(true);
		setVisibleCount(PAGE_SIZE);

		const idsToLoad = col.animeIds.slice(0, PAGE_SIZE);
		invoke<Anime[]>("get_anime_batch", { ids: idsToLoad })
			.then((data) => setAnimeList(data))
			.catch(() => setAnimeList([]))
			.finally(() => setLoadingAnime(false));
	}, [activeTab, collections]);

	const handleLoadMore = async () => {
		const col = collections.find((c) => c.id === activeTab);
		if (!col) return;
		const nextCount = visibleCount + PAGE_SIZE;
		const idsToLoad = col.animeIds.slice(visibleCount, nextCount);
		if (idsToLoad.length === 0) return;

		setLoadingAnime(true);
		try {
			const data = await invoke<Anime[]>("get_anime_batch", {
				ids: idsToLoad,
			});
			setAnimeList((prev) => [...prev, ...data]);
			setVisibleCount(nextCount);
		} catch {
			/* empty */
		} finally {
			setLoadingAnime(false);
		}
	};

	const activeCollection = collections.find((c) => c.id === activeTab);
	const hasMore =
		activeCollection &&
		visibleCount < activeCollection.animeIds.length;

	function getTabLabel(name: string): string {
		const key = COLLECTION_I18N[name];
		return key ? t(key) : name;
	}

	return (
		<div className="flex flex-col gap-6 overflow-y-auto pb-8 pr-2">
			{/* Header */}
			<div className="flex items-center gap-3">
				<FolderOpen size={24} className="text-text-primary" />
				<h1 className="text-2xl font-bold text-text-primary">
					{t("collections.title")}
				</h1>
			</div>

			{loadingCollections ? (
				<div className="flex justify-center py-12">
					<Loader2
						size={24}
						className="animate-spin text-text-muted"
					/>
				</div>
			) : collections.length === 0 ? (
				<div className="rounded-xl border border-border bg-bg-card p-12 text-center">
					<p className="text-text-secondary">
						{t("common.noData")}
					</p>
				</div>
			) : (
				<>
					{/* Tabs */}
					<div className="scrollbar-hide flex gap-1 overflow-x-auto rounded-lg bg-bg-card p-1">
						{collections.map((col) => (
							<button
								key={col.id}
								type="button"
								onClick={() => setActiveTab(col.id)}
								className={`shrink-0 rounded-md px-4 py-2 text-sm transition-default ${
									activeTab === col.id
										? "bg-white text-black font-medium"
										: "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
								}`}
							>
								{getTabLabel(col.name)}
								<span className="ml-1.5 text-xs opacity-60">
									{col.animeIds.length}
								</span>
							</button>
						))}
					</div>

					{/* Grid */}
					{loadingAnime && animeList.length === 0 ? (
						<div className="flex justify-center py-12">
							<Loader2
								size={24}
								className="animate-spin text-text-muted"
							/>
						</div>
					) : animeList.length === 0 ? (
						<div className="rounded-xl border border-border bg-bg-card p-12 text-center">
							<FolderOpen
								size={48}
								className="mx-auto mb-4 text-text-muted"
							/>
							<p className="text-text-secondary">
								{t("collections.empty")}
							</p>
						</div>
					) : (
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
							{animeList.map((anime) => (
								<button
									key={anime.id}
									type="button"
									onClick={() =>
										navigate(`/anime/${anime.id}`)
									}
									className="group flex flex-col overflow-hidden rounded-xl border border-border bg-bg-card transition-default hover:border-[#333] hover:scale-[1.02]"
								>
									{/* Placeholder thumb */}
									<div className="flex aspect-video w-full items-center justify-center bg-bg-elevated">
										<span className="px-2 text-center text-xs text-text-muted line-clamp-2">
											{anime.name}
										</span>
									</div>
									<div className="flex flex-col gap-1 p-3">
										<span className="truncate text-sm font-medium text-text-primary">
											{anime.name}
										</span>
										<div className="flex items-center gap-2">
											<Star
												size={10}
												className="text-warning"
												fill="currentColor"
											/>
											<span className="text-xs text-text-muted">
												{anime.rating.toFixed(1)}
											</span>
											{anime.studio && (
												<span className="truncate text-xs text-text-muted">
													· {anime.studio}
												</span>
											)}
										</div>
									</div>
								</button>
							))}
						</div>
					)}

					{/* Load more */}
					{hasMore && (
						<button
							type="button"
							onClick={handleLoadMore}
							disabled={loadingAnime}
							className="mx-auto flex items-center gap-2 rounded-lg border border-border px-6 py-2 text-sm text-text-secondary transition-default hover:border-[#333] hover:text-text-primary disabled:opacity-50"
						>
							{loadingAnime && (
								<Loader2
									size={14}
									className="animate-spin"
								/>
							)}
							{t("common.loadMore")}
						</button>
					)}
				</>
			)}
		</div>
	);
}