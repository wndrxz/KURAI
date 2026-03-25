import { useState, useEffect, useCallback } from "react";
import { Clock, Play, Check, ChevronRight, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router";
import { useTranslation } from "../lib/i18n";

interface WatchEntry {
	privateVideoId: string;
	animeName: string;
	animeId: number;
	seriesId: number;
	timeSec: number;
	season: number;
	series: number;
	watched: boolean;
}

function formatTime(sec: number): string {
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
}

export default function HistoryPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [entries, setEntries] = useState<WatchEntry[]>([]);
	const [page, setPage] = useState(0);
	const [loading, setLoading] = useState(true);
	const [hasMore, setHasMore] = useState(true);

	const loadPage = useCallback(async (p: number, append = false) => {
		setLoading(true);
		try {
			const data = await invoke<WatchEntry[]>("get_watch_history", {
				page: p,
			});
			if (data.length === 0) {
				setHasMore(false);
			} else {
				setEntries((prev) => (append ? [...prev, ...data] : data));
			}
		} catch {
			setHasMore(false);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadPage(0);
	}, [loadPage]);

	const handleLoadMore = () => {
		const next = page + 1;
		setPage(next);
		loadPage(next, true);
	};

	return (
		<div className="flex flex-col gap-6 overflow-y-auto pb-8 pr-2">
			<div className="flex items-center gap-3">
				<Clock size={24} className="text-text-primary" />
				<h1 className="text-2xl font-bold text-text-primary">
					{t("history.title")}
				</h1>
			</div>

			{!loading && entries.length === 0 && (
				<div className="rounded-xl border border-border bg-bg-card p-12 text-center">
					<Clock
						size={48}
						className="mx-auto mb-4 text-text-muted"
					/>
					<p className="text-text-secondary">
						{t("history.empty")}
					</p>
				</div>
			)}

			<div className="flex flex-col gap-1">
				{entries.map((entry, idx) => (
					<button
						type="button"
						key={`${entry.seriesId}-${idx}`}
						onClick={() =>
							navigate(`/anime/${entry.animeId}`)
						}
						className="flex items-center gap-4 rounded-lg border border-transparent bg-bg-card px-4 py-3 text-left transition-default hover:border-border hover:bg-bg-hover"
					>
						<div
							className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
								entry.watched
									? "bg-success/10 text-success"
									: "bg-bg-elevated text-text-muted"
							}`}
						>
							{entry.watched ? (
								<Check size={14} />
							) : (
								<Play size={14} />
							)}
						</div>

						<div className="flex min-w-0 flex-1 flex-col">
							<span className="truncate text-sm font-medium text-text-primary">
								{entry.animeName}
							</span>
							<span className="text-xs text-text-muted">
								{t("history.season")} {entry.season} ·{" "}
								{t("history.episode")} {entry.series}
							</span>
						</div>

						<span className="shrink-0 font-mono text-xs text-text-muted">
							{formatTime(entry.timeSec)}
						</span>

						<span
							className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium ${
								entry.watched
									? "bg-success/10 text-success"
									: "bg-bg-elevated text-text-muted"
							}`}
						>
							{entry.watched
								? t("history.watched")
								: t("history.inProgress")}
						</span>

						<ChevronRight
							size={14}
							className="shrink-0 text-text-muted"
						/>
					</button>
				))}
			</div>

			{loading && (
				<div className="flex justify-center py-8">
					<Loader2
						size={24}
						className="animate-spin text-text-muted"
					/>
				</div>
			)}

			{!loading && hasMore && entries.length > 0 && (
				<button
					type="button"
					onClick={handleLoadMore}
					className="mx-auto rounded-lg border border-border px-6 py-2 text-sm text-text-secondary transition-default hover:border-[#333] hover:text-text-primary"
				>
					{t("common.loadMore")}
				</button>
			)}
		</div>
	);
}