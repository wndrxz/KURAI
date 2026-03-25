import type { DisplayAnime } from "../lib/types";
import { AnimeCard } from "./anime-card";

interface AnimeGridProps {
	items: DisplayAnime[];
}

export function AnimeGrid({ items }: AnimeGridProps) {
	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
			{items.map((anime) => (
				<AnimeCard key={anime.id} anime={anime} />
			))}
		</div>
	);
}