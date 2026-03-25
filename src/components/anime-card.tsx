import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Star } from "lucide-react";
import type { DisplayAnime } from "../lib/types";
import { getCachedCover, fetchCover } from "../lib/shikimori";
import { getThumb, getCachedThumb } from "../lib/thumb-cache";

interface AnimeCardProps {
	anime: DisplayAnime;
	showRating?: boolean;
	subtitle?: string;
}

export function AnimeCard({
	anime,
	showRating = true,
	subtitle,
}: AnimeCardProps) {
	const navigate = useNavigate();
	const ref = useRef<HTMLDivElement>(null);
	const [imgReady, setImgReady] = useState(false);
	const mountedRef = useRef(true);

	// Sync cache check
	const [cover, setCover] = useState<string | null>(() => {
		const shiki = getCachedCover(anime.name);
		if (typeof shiki === "string") return shiki;
		const thumb = getCachedThumb(anime.id);
		if (thumb) return thumb;
		return null;
	});

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	// Lazy load via IntersectionObserver
	useEffect(() => {
		if (cover) return;

		const el = ref.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					observer.disconnect();
					loadCover();
				}
			},
			{ rootMargin: "200px" },
		);

		observer.observe(el);
		return () => observer.disconnect();
		// biome-ignore lint/correctness/useExhaustiveDependencies: load once
	}, [cover]);

	async function loadCover() {
		// 1. Shikimori (queued, rate-limited)
		const shikiUrl = await fetchCover(anime.name);
		if (!mountedRef.current) return;
		if (shikiUrl) {
			setCover(shikiUrl);
			return;
		}

		// 2. Fallback: Animix thumb via Rust
		try {
			const thumbUrl = await getThumb(anime.id);
			if (!mountedRef.current) return;
			if (thumbUrl) {
				setCover(thumbUrl);
			}
		} catch {
			// no cover available
		}
	}

	return (
		<div
			ref={ref}
			onClick={() => navigate(`/anime/${anime.id}`)}
			onKeyDown={(e) => {
				if (e.key === "Enter") navigate(`/anime/${anime.id}`);
			}}
			className="group flex cursor-pointer flex-col gap-2"
		>
			{/* Thumbnail */}
			<div className="relative aspect-video w-full overflow-hidden rounded-xl border border-transparent bg-bg-elevated transition-default group-hover:scale-[1.02] group-hover:border-border">
				{cover ? (
					<img
						src={cover}
						alt={anime.name}
						className={`h-full w-full object-cover transition-opacity duration-300 ${imgReady ? "opacity-100" : "opacity-0"}`}
						onLoad={() => setImgReady(true)}
						onError={() => {
							// If cover URL fails (e.g. Shikimori image 404), clear and try fallback
							setCover(null);
							setImgReady(false);
						}}
						draggable={false}
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center p-3">
						<span className="line-clamp-2 text-center text-xs text-text-muted">
							{anime.name}
						</span>
					</div>
				)}

				{showRating && anime.rating > 0 && (
					<div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium backdrop-blur-sm">
						<Star size={10} className="fill-warning text-warning" />
						<span className="text-text-primary">
							{anime.rating.toFixed(1)}
						</span>
					</div>
				)}
			</div>

			{/* Info */}
			<div className="flex flex-col gap-0.5 px-0.5">
				<h3 className="line-clamp-1 text-sm font-medium text-text-primary transition-default group-hover:text-accent-hover">
					{anime.name}
				</h3>
				{subtitle ? (
					<p className="line-clamp-1 text-xs text-text-secondary">
						{subtitle}
					</p>
				) : anime.genres.length > 0 ? (
					<p className="line-clamp-1 text-xs text-text-muted">
						{anime.genres.slice(0, 3).join(", ")}
					</p>
				) : null}
			</div>
		</div>
	);
}