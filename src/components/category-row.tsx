import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DisplayAnime } from "../lib/types";
import { AnimeCard } from "./anime-card";

interface CategoryRowProps {
	title: string;
	items: DisplayAnime[];
	subtitle?: (anime: DisplayAnime) => string | undefined;
}

export function CategoryRow({ title, items, subtitle }: CategoryRowProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [canLeft, setCanLeft] = useState(false);
	const [canRight, setCanRight] = useState(false);

	const check = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		setCanLeft(el.scrollLeft > 4);
		setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-check arrows when item count changes
	useEffect(() => {
		check();
		const el = scrollRef.current;
		if (!el) return;
		el.addEventListener("scroll", check, { passive: true });
		const ro = new ResizeObserver(check);
		ro.observe(el);
		return () => {
			el.removeEventListener("scroll", check);
			ro.disconnect();
		};
	}, [check, items.length]);

	const scroll = (dir: "left" | "right") => {
		const el = scrollRef.current;
		if (!el) return;
		el.scrollBy({
			left: dir === "left" ? -el.clientWidth * 0.8 : el.clientWidth * 0.8,
			behavior: "smooth",
		});
	};

	if (items.length === 0) return null;

	return (
		<section className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-text-primary">
					{title}
				</h2>
				<div className="flex gap-1">
					{canLeft && (
						<button
							type="button"
							onClick={() => scroll("left")}
							className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-default hover:bg-bg-hover hover:text-text-secondary"
						>
							<ChevronLeft size={16} />
						</button>
					)}
					{canRight && (
						<button
							type="button"
							onClick={() => scroll("right")}
							className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-default hover:bg-bg-hover hover:text-text-secondary"
						>
							<ChevronRight size={16} />
						</button>
					)}
				</div>
			</div>

			<div
				ref={scrollRef}
				className="scrollbar-hide flex gap-4 overflow-x-auto pb-2"
			>
				{items.map((anime) => (
					<div key={anime.id} className="w-[200px] shrink-0">
						<AnimeCard
							anime={anime}
							subtitle={subtitle?.(anime)}
						/>
					</div>
				))}
			</div>
		</section>
	);
}