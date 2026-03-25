import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type {
	WatchEntry,
	Recommendations,
	DisplayAnime,
} from "../lib/types";
import { animeToDisplay } from "../lib/types";
import { CategoryRow } from "../components/category-row";
import { RowSkeleton } from "../components/skeleton";
import { showToast } from "../components/toast";

export default function HomePage() {
	const [lastWatch, setLastWatch] = useState<WatchEntry[] | null>(null);
	const [recs, setRecs] = useState<Recommendations | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			const [wRes, rRes] = await Promise.allSettled([
				invoke<WatchEntry[]>("get_last_watch"),
				invoke<Recommendations>("catalog_get_recommendations"),
			]);

			if (cancelled) return;

			if (wRes.status === "fulfilled") setLastWatch(wRes.value);
			else showToast("Не удалось загрузить историю", "error");

			if (rRes.status === "fulfilled") setRecs(rRes.value);
			else showToast("Не удалось загрузить рекомендации", "error");

			setLoading(false);
		}

		load();
		return () => {
			cancelled = true;
		};
	}, []);

	// Deduplicate continue-watching
	const continueItems: DisplayAnime[] = [];
	const seen = new Set<number>();
	if (lastWatch) {
		for (const w of lastWatch) {
			if (seen.has(w.animeId)) continue;
			seen.add(w.animeId);
			continueItems.push({
				id: w.animeId,
				name: w.animeName,
				rating: 0,
				genres: [],
				studio: null,
			});
		}
	}

	// Safe extraction of rec lists
	const viralList = recs?.VIRAL ?? [];
	const ratingList = recs?.RATING ?? [];
	const userRatingList = recs?.USER_RATING ?? [];
	const categoryList = recs?.CATEGORY?.animeList ?? [];
	const categoryName = recs?.CATEGORY?.name ?? "";

	if (loading) {
		return (
			<div className="flex flex-col gap-8">
				<section>
					<h2 className="mb-3 text-lg font-semibold text-text-primary">
						Продолжить просмотр
					</h2>
					<RowSkeleton />
				</section>
				<section>
					<h2 className="mb-3 text-lg font-semibold text-text-primary">
						Популярное
					</h2>
					<RowSkeleton />
				</section>
				<section>
					<h2 className="mb-3 text-lg font-semibold text-text-primary">
						Высокий рейтинг
					</h2>
					<RowSkeleton />
				</section>
			</div>
		);
	}

	const hasAnything =
		continueItems.length > 0 ||
		viralList.length > 0 ||
		ratingList.length > 0 ||
		userRatingList.length > 0 ||
		categoryList.length > 0;

	return (
		<div className="flex flex-col gap-8">
			{continueItems.length > 0 && (
				<CategoryRow
					title="Продолжить просмотр"
					items={continueItems}
					subtitle={(anime) => {
						const entry = lastWatch?.find(
							(w) => w.animeId === anime.id,
						);
						if (!entry) return undefined;
						return `Сезон ${entry.season}, Эпизод ${entry.series}`;
					}}
				/>
			)}

			{viralList.length > 0 && (
				<CategoryRow
					title="Популярное"
					items={viralList.map(animeToDisplay)}
				/>
			)}

			{ratingList.length > 0 && (
				<CategoryRow
					title="Высокий рейтинг"
					items={ratingList.map(animeToDisplay)}
				/>
			)}

			{userRatingList.length > 0 && (
				<CategoryRow
					title="Оценки пользователей"
					items={userRatingList.map(animeToDisplay)}
				/>
			)}

			{categoryList.length > 0 && categoryName && (
				<CategoryRow
					title={categoryName}
					items={categoryList.map(animeToDisplay)}
				/>
			)}

			{!hasAnything && (
				<div className="flex flex-col items-center justify-center py-20 text-center">
					<p className="text-lg text-text-secondary">
						Здесь пока пусто
					</p>
					<p className="text-sm text-text-muted">
						Начните смотреть аниме из каталога
					</p>
				</div>
			)}
		</div>
	);
}