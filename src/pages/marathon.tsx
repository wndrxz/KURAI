import { useEffect, useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useMarathonStore } from "../stores/marathon";
import { MarathonStatusBar } from "../components/marathon-status";
import { MarathonQueue } from "../components/marathon-queue";
import {
	MarathonConfigPanel,
	type MarathonConfigData,
} from "../components/marathon-config";
import {
	Search,
	Plus,
	Loader2,
	History,
	Zap,
} from "lucide-react";

interface SearchAnime {
	id: number;
	name: string;
	genres: string[];
	studio: string | null;
	available: boolean;
	rating: number;
}

interface SeriesData {
	[season: string]: Array<{
		id: number;
		seriesNum: number;
		season: number;
		status: number;
	}>;
}

export default function MarathonPage() {
	const {
		queue,
		status,
		sessions,
		loadQueue,
		loadStatus,
		loadSessions,
		addToQueue,
		startCustom,
	} = useMarathonStore();

	const handleStart = async (config: MarathonConfigData, headless: boolean) => {
		if (config.preset === "custom") {
			await startCustom(config, headless);
		} else {
			await useMarathonStore.getState().start(headless, config.preset);
		}
	};

	useEffect(() => {
		loadQueue();
		loadStatus();
		loadSessions();
	}, [loadQueue, loadStatus, loadSessions]);

	return (
		<div className="flex flex-col gap-6 p-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<Zap className="h-6 w-6 text-text-primary" />
				<h1 className="text-2xl font-bold text-text-primary">
					Марафон
				</h1>
				{status.active && (
					<span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
						Активен
					</span>
				)}
			</div>

			{/* Config + Start (shown when NOT running) */}
			{!status.active && (
				<MarathonConfigPanel
					isRunning={status.active}
					isStarting={useMarathonStore.getState().isStarting}
					onStart={handleStart}
				/>
			)}

			{/* Status & Controls (shown when running) */}
			{status.active && <MarathonStatusBar status={status} />}

			{/* Queue */}
			<section>
				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
						Очередь ({queue.length})
					</h2>
					{queue.some((q) => q.status === "error") && (
						<button
							type="button"
							onClick={() => useMarathonStore.getState().resetErrors()}
							className="rounded-md px-2.5 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
						>
							Сбросить ошибки
						</button>
					)}
				</div>
				{queue.length === 0 ? (
					<div className="rounded-xl border border-border bg-bg-card p-8 text-center text-text-muted">
						Очередь пуста. Добавьте аниме ниже.
					</div>
				) : (
					<MarathonQueue items={queue} isRunning={status.active} />
				)}
			</section>

			{/* Add to queue */}
			<AddSection onAdd={addToQueue} />

			{/* Session history */}
			{sessions.length > 0 && (
				<section>
					<h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">
						<History className="h-4 w-4" />
						История сессий
					</h2>
					<div className="space-y-2">
						{sessions.map((s) => (
							<div
								key={s.id}
								className="flex items-center justify-between rounded-lg border border-border bg-bg-card px-4 py-3"
							>
								<div className="flex items-center gap-4 text-sm">
									<span className="text-text-primary">
										{s.totalEpisodes} эп.
									</span>
									<span className="text-text-secondary">
										{formatDuration(s.totalSeconds)}
									</span>
									<span className="text-text-muted">
										{formatDate(s.startedAt)}
									</span>
								</div>
								<SessionBadge status={s.status} />
							</div>
						))}
					</div>
				</section>
			)}
		</div>
	);
}

// ═══════════════════════════════════════
// Add Section
// ═══════════════════════════════════════

interface AddSectionProps {
	onAdd: (
		animeId: number,
		title: string,
		totalEps: number,
		startEp: number,
		endEp?: number,
	) => Promise<void>;
}

function AddSection({ onAdd }: AddSectionProps) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchAnime[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [showResults, setShowResults] = useState(false);

	const [selected, setSelected] = useState<{
		id: number;
		name: string;
	} | null>(null);
	const [totalEps, setTotalEps] = useState(0);
	const [startEp, setStartEp] = useState(1);
	const [endEp, setEndEp] = useState(1);
	const [isLoadingEps, setIsLoadingEps] = useState(false);
	const [isAdding, setIsAdding] = useState(false);

	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Debounced search
	const handleSearch = useCallback((value: string) => {
		setQuery(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);

		if (value.trim().length < 2) {
			setResults([]);
			setShowResults(false);
			return;
		}

		debounceRef.current = setTimeout(async () => {
			setIsSearching(true);
			try {
				const res = await invoke<SearchAnime[]>("catalog_search", {
					query: value,
					page: 0,
				});
				setResults(res);
				setShowResults(true);
			} catch (e) {
				console.error("Search failed:", e);
			} finally {
				setIsSearching(false);
			}
		}, 300);
	}, []);

	// Select anime → load episode count
	const handleSelect = useCallback(async (anime: SearchAnime) => {
		setSelected({ id: anime.id, name: anime.name });
		setShowResults(false);
		setQuery("");
		setIsLoadingEps(true);

		try {
			const series = await invoke<SeriesData>("get_series", {
				animeId: anime.id,
			});

			let count = 0;
			for (const eps of Object.values(series)) {
				count += eps.filter((e) => e.status === 3).length;
			}

			setTotalEps(count);
			setStartEp(1);
			setEndEp(count);
		} catch (e) {
			console.error("Failed to load series:", e);
			setTotalEps(0);
		} finally {
			setIsLoadingEps(false);
		}
	}, []);

	const handleAdd = async () => {
		if (!selected || totalEps === 0) return;
		setIsAdding(true);
		try {
			await onAdd(
				selected.id,
				selected.name,
				totalEps,
				startEp,
				endEp < totalEps ? endEp : undefined,
			);
			setSelected(null);
			setTotalEps(0);
		} catch (e) {
			console.error("Failed to add:", e);
		} finally {
			setIsAdding(false);
		}
	};

	// Close dropdown on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setShowResults(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	return (
		<section>
			<h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
				Добавить в очередь
			</h2>
			<div className="rounded-xl border border-border bg-bg-card p-4">
				{/* Search */}
				<div ref={containerRef} className="relative">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
						<input
							type="text"
							value={query}
							onChange={(e) => handleSearch(e.target.value)}
							placeholder="Найти аниме..."
							className="w-full rounded-lg border border-border bg-bg-root py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-[#333]"
						/>
						{isSearching && (
							<Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted" />
						)}
					</div>

					{/* Results dropdown */}
					{showResults && results.length > 0 && (
						<div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-bg-elevated shadow-xl">
							{results.map((anime) => (
								<button
									key={anime.id}
									type="button"
									onClick={() => handleSelect(anime)}
									className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-bg-hover"
								>
									<span className="text-sm text-text-primary">
										{anime.name}
									</span>
									<span className="text-xs text-text-muted">
										★ {anime.rating.toFixed(1)}
									</span>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Selected anime */}
				{selected && (
					<div className="mt-4 space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-text-primary">
								{selected.name}
							</span>
							{isLoadingEps ? (
								<Loader2 className="h-4 w-4 animate-spin text-text-muted" />
							) : (
								<span className="text-xs text-text-secondary">
									{totalEps} эпизодов
								</span>
							)}
						</div>

						{totalEps > 0 && (
							<div className="flex items-center gap-3">
								<span className="text-xs text-text-secondary">
									С
								</span>
								<input
									type="number"
									min={1}
									max={totalEps}
									value={startEp}
									onChange={(e) =>
										setStartEp(
											Math.max(
												1,
												Math.min(
													totalEps,
													+e.target.value || 1,
												),
											),
										)
									}
									className="w-20 rounded-md border border-border bg-bg-root px-3 py-1.5 text-center text-sm text-text-primary outline-none focus:border-[#333]"
								/>
								<span className="text-xs text-text-secondary">
									по
								</span>
								<input
									type="number"
									min={startEp}
									max={totalEps}
									value={endEp}
									onChange={(e) =>
										setEndEp(
											Math.max(
												startEp,
												Math.min(
													totalEps,
													+e.target.value ||
														totalEps,
												),
											),
										)
									}
									className="w-20 rounded-md border border-border bg-bg-root px-3 py-1.5 text-center text-sm text-text-primary outline-none focus:border-[#333]"
								/>
								<button
									type="button"
									onClick={handleAdd}
									disabled={isAdding}
									className="ml-auto flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#ccc] disabled:opacity-50"
								>
									{isAdding ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Plus className="h-4 w-4" />
									)}
									Добавить
								</button>
							</div>
						)}
					</div>
				)}
			</div>
		</section>
	);
}

// ═══════════════════════════════════════
// Helpers
// ═══════════════════════════════════════

function SessionBadge({ status }: { status: string }) {
	const styles: Record<string, string> = {
		completed: "bg-emerald-500/20 text-emerald-400",
		stopped: "bg-yellow-500/20 text-yellow-400",
		running: "bg-blue-500/20 text-blue-400",
		error: "bg-red-500/20 text-red-400",
	};

	return (
		<span
			className={`rounded px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-bg-hover text-text-muted"}`}
		>
			{status}
		</span>
	);
}

function formatDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	if (h > 0) {
		return `${h}ч ${m.toString().padStart(2, "0")}м`;
	}
	return `${m}м ${s.toString().padStart(2, "0")}с`;
}

function formatDate(unixSecs: number): string {
	return new Date(unixSecs * 1000).toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
}