import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import {
	ArrowLeft,
	Star,
	Play,
	Zap,
	Eye,
	Bookmark,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { Anime, Series, WatchEntry, Collection } from "../lib/types";
import { getThumb, getCachedThumb } from "../lib/thumb-cache";
import { Skeleton } from "../components/skeleton";
import { EpisodeList } from "../components/episode-list";
import { MarathonDialog } from "../components/marathon-dialog";
import { usePlayerStore } from "../stores/player";

export default function AnimePage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const numId = Number(id);

	const [anime, setAnime] = useState<Anime | null>(null);
	const [seasons, setSeasons] = useState<Record<string, Series[]> | null>(
		null,
	);
	const [watchHistory, setWatchHistory] = useState<WatchEntry[]>([]);
	const [collections, setCollections] = useState<Collection[]>([]);
	const [thumb, setThumb] = useState<string | null>(
		() => getCachedThumb(numId) ?? null,
	);
	const [imgReady, setImgReady] = useState(false);
	const [loading, setLoading] = useState(true);
	const [descExpanded, setDescExpanded] = useState(false);
	const [showMarathon, setShowMarathon] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!numId || Number.isNaN(numId)) {
			setError("Неверный ID аниме");
			setLoading(false);
			return;
		}

		let cancelled = false;

		async function load() {
			const [animeRes, seriesRes, watchRes, collRes] =
				await Promise.allSettled([
					invoke<Anime>("catalog_get", { id: numId }),
					invoke<Record<string, Series[]>>("get_series", {
						animeId: numId,
					}),
					invoke<WatchEntry[]>("get_last_watch"),
					invoke<Collection[]>("get_collections"),
				]);

			if (cancelled) return;

			if (animeRes.status === "fulfilled") {
				setAnime(animeRes.value);
			} else {
				setError("Не удалось загрузить аниме");
			}

			if (seriesRes.status === "fulfilled") {
				setSeasons(seriesRes.value);
			}

			if (watchRes.status === "fulfilled") {
				setWatchHistory(watchRes.value);
			}

			if (collRes.status === "fulfilled") {
				setCollections(collRes.value);
			}

			setLoading(false);
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [numId]);

	useEffect(() => {
		if (thumb || !numId) return;
		getThumb(numId).then((url) => {
			if (url) setThumb(url);
		});
	}, [numId, thumb]);

	const genres = useMemo(() => {
		if (!anime?.genres) return [];
		return anime.genres
			.split(",")
			.map((g) => g.trim())
			.filter(Boolean);
	}, [anime?.genres]);

	const sortedSeasonKeys = useMemo(() => {
		if (!seasons) return [];
		return Object.keys(seasons).sort((a, b) => Number(a) - Number(b));
	}, [seasons]);

	const totalEpisodes = useMemo(() => {
		if (!seasons) return 0;
		return Object.values(seasons).reduce(
			(sum, eps) => sum + eps.length,
			0,
		);
	}, [seasons]);

	const collectionNames = useMemo(() => {
		if (!anime || collections.length === 0) return [];
		return collections
			.filter((c) => c.animeIds.includes(anime.id))
			.map((c) => c.name);
	}, [anime, collections]);

	const animeWatchHistory = useMemo(() => {
		if (!anime) return [];
		return watchHistory.filter((w) => w.animeId === anime.id);
	}, [anime, watchHistory]);

	const nextEpisode = useMemo(() => {
		if (!seasons || !anime) return null;

		for (const key of sortedSeasonKeys) {
			const eps = [...(seasons[key] || [])].sort(
				(a, b) => a.seriesNum - b.seriesNum,
			);
			for (const ep of eps) {
				const entry = animeWatchHistory.find(
					(w) => w.season === ep.season && w.series === ep.seriesNum,
				);
				if (!entry || !entry.watched) {
					return {
						season: ep.season,
						episode: ep.seriesNum,
						series: ep,
					};
				}
			}
		}

		const firstKey = sortedSeasonKeys[0];
		if (!firstKey || !seasons[firstKey]?.length) return null;
		const first = [...seasons[firstKey]].sort(
			(a, b) => a.seriesNum - b.seriesNum,
		)[0];
		return {
			season: first.season,
			episode: first.seriesNum,
			series: first,
		};
	}, [seasons, sortedSeasonKeys, anime, animeWatchHistory]);

	// ── Play: just open overlay, no navigation ──
	const handleWatch = useCallback(() => {
		if (!nextEpisode || !anime) return;
		const { series: ep } = nextEpisode;

		usePlayerStore.getState().setPlayback({
			animeId: anime.id,
			animeTitle: anime.name,
			season: nextEpisode.season,
			episode: nextEpisode.episode,
			seriesId: ep.id,
			privateId: ep.privateId,
			quality: ep.videoQuality,
		});
	}, [nextEpisode, anime]);

	if (loading) {
		return (
			<div className="flex flex-col gap-6">
				<button
					type="button"
					onClick={() => navigate(-1)}
					className="flex w-fit items-center gap-1.5 text-sm text-text-muted transition-default hover:text-text-secondary"
				>
					<ArrowLeft size={14} />
					Назад
				</button>
				<div className="flex flex-col gap-6 md:flex-row">
					<Skeleton className="aspect-video w-full shrink-0 rounded-xl md:w-72 lg:w-80" />
					<div className="flex flex-1 flex-col gap-3">
						<Skeleton className="h-8 w-2/3" />
						<Skeleton className="h-4 w-1/3" />
						<Skeleton className="h-24 w-full" />
						<div className="flex gap-2">
							<Skeleton className="h-6 w-20 rounded" />
							<Skeleton className="h-6 w-16 rounded" />
							<Skeleton className="h-6 w-24 rounded" />
						</div>
					</div>
				</div>
				<Skeleton className="h-6 w-24" />
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton
						key={`ep-sk-${String(i)}`}
						className="h-12 w-full"
					/>
				))}
			</div>
		);
	}

	if (error || !anime) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-20">
				<p className="text-lg text-text-secondary">
					{error || "Аниме не найдено"}
				</p>
				<button
					type="button"
					onClick={() => navigate(-1)}
					className="rounded-lg bg-bg-elevated px-4 py-2 text-sm text-text-primary transition-default hover:bg-bg-hover"
				>
					Вернуться
				</button>
			</div>
		);
	}

	const descriptionLong = anime.description.length > 280;

	return (
		<div className="flex flex-col gap-6">
			<button
				type="button"
				onClick={() => navigate(-1)}
				className="flex w-fit items-center gap-1.5 text-sm text-text-muted transition-default hover:text-text-secondary"
			>
				<ArrowLeft size={14} />
				Назад
			</button>

			{/* ── Hero ── */}
			<div className="flex flex-col gap-6 md:flex-row">
				<div className="w-full shrink-0 md:w-72 lg:w-80">
					<div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border-subtle bg-bg-elevated">
						{thumb ? (
							<img
								src={thumb}
								alt={anime.name}
								className={`h-full w-full object-cover transition-opacity duration-300 ${imgReady ? "opacity-100" : "opacity-0"}`}
								onLoad={() => setImgReady(true)}
								draggable={false}
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center p-4">
								<span className="text-center text-sm text-text-muted">
									{anime.name}
								</span>
							</div>
						)}
					</div>
				</div>

				<div className="flex flex-1 flex-col gap-3">
					<h1 className="text-2xl font-bold leading-tight text-text-primary">
						{anime.name}
					</h1>

					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
						{anime.rating > 0 && (
							<span className="flex items-center gap-1">
								<Star
									size={13}
									className="fill-warning text-warning"
								/>
								{anime.rating.toFixed(1)}
							</span>
						)}
						{anime.pg > 0 && (
							<span className="rounded bg-bg-elevated px-1.5 py-0.5 text-xs">
								{anime.pg}+
							</span>
						)}
						{anime.studio && <span>{anime.studio}</span>}
						{anime.movie && (
							<span className="rounded bg-bg-elevated px-1.5 py-0.5 text-xs">
								Фильм
							</span>
						)}
						{anime.hq && (
							<span className="rounded bg-bg-elevated px-1.5 py-0.5 text-xs text-warning">
								HQ
							</span>
						)}
					</div>

					{anime.productionDates && (
						<p className="text-xs text-text-muted">
							{anime.productionDates}
						</p>
					)}

					{genres.length > 0 && (
						<div className="flex flex-wrap gap-1.5">
							{genres.map((g) => (
								<span
									key={g}
									className="rounded bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary"
								>
									{g}
								</span>
							))}
						</div>
					)}

					{anime.description && (
						<div className="text-sm leading-relaxed text-text-secondary">
							<p
								className={
									!descExpanded && descriptionLong
										? "line-clamp-4"
										: ""
								}
							>
								{anime.description}
							</p>
							{descriptionLong && (
								<button
									type="button"
									onClick={() =>
										setDescExpanded(!descExpanded)
									}
									className="mt-1 flex items-center gap-1 text-xs text-text-muted transition-default hover:text-text-secondary"
								>
									{descExpanded ? (
										<>
											Скрыть <ChevronUp size={12} />
										</>
									) : (
										<>
											Показать ещё{" "}
											<ChevronDown size={12} />
										</>
									)}
								</button>
							)}
						</div>
					)}

					{anime.announce && (
						<p className="rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-xs text-text-muted">
							📢 {anime.announce}
						</p>
					)}

					{collectionNames.length > 0 && (
						<div className="flex items-center gap-1.5 text-xs text-text-muted">
							<Bookmark size={12} />
							{collectionNames.join(", ")}
						</div>
					)}

					{anime.watchCount > 0 && (
						<div className="flex items-center gap-1.5 text-xs text-text-muted">
							<Eye size={12} />
							{anime.watchCount.toLocaleString("ru-RU")}{" "}
							просмотров
						</div>
					)}

					<div className="mt-1 flex gap-3">
						{totalEpisodes > 0 && (
							<button
								type="button"
								onClick={handleWatch}
								className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-black transition-default hover:bg-accent-hover"
							>
								<Play size={15} className="fill-current" />
								Смотреть
								{nextEpisode && (
									<span className="text-xs opacity-70">
										С{nextEpisode.season}:Э
										{nextEpisode.episode}
									</span>
								)}
							</button>
						)}
						{totalEpisodes > 0 && (
							<button
								type="button"
								onClick={() => setShowMarathon(true)}
								className="flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm text-text-primary transition-default hover:bg-bg-hover"
							>
								<Zap size={15} />
								В марафон
							</button>
						)}
					</div>
				</div>
			</div>

			{/* ── Episodes ── */}
			{seasons && totalEpisodes > 0 ? (
				<EpisodeList
					animeId={anime.id}
					animeTitle={anime.name}
					seasons={seasons}
					seasonKeys={sortedSeasonKeys}
					watchHistory={animeWatchHistory}
				/>
			) : seasons && totalEpisodes === 0 ? (
				<div className="py-10 text-center">
					<p className="text-text-muted">
						Эпизоды пока не добавлены
					</p>
				</div>
			) : null}

			{showMarathon && anime && (
				<MarathonDialog
					anime={anime}
					totalEpisodes={totalEpisodes}
					onClose={() => setShowMarathon(false)}
				/>
			)}
		</div>
	);
}