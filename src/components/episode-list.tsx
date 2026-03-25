import { useState, useEffect } from "react";
import { Play, Check, Clock, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { Series, WatchEntry, QualityOption } from "../lib/types";
import { QUALITIES } from "../lib/constants";
import { formatDuration } from "../lib/utils";
import { QualityPicker } from "./quality-picker";
import { usePlayerStore } from "../stores/player";

interface EpisodeListProps {
	animeId: number;
	animeTitle: string;
	seasons: Record<string, Series[]>;
	seasonKeys: string[];
	watchHistory: WatchEntry[];
}

export function EpisodeList({
	animeId,
	animeTitle,
	seasons,
	seasonKeys,
	watchHistory,
}: EpisodeListProps) {
	const [selectedSeason, setSelectedSeason] = useState(
		() => seasonKeys[0] || "1",
	);
	const [loadingEp, setLoadingEp] = useState<number | null>(null);
	const [pickerState, setPickerState] = useState<{
		ep: number;
		options: QualityOption[];
	} | null>(null);

	const episodes = (seasons[selectedSeason] || [])
		.slice()
		.sort((a, b) => a.seriesNum - b.seriesNum);

	const seasonNum = Number(selectedSeason);

	function getWatchStatus(ep: Series): "watched" | "partial" | "none" {
		const entry = watchHistory.find(
			(w) => w.season === ep.season && w.series === ep.seriesNum,
		);
		if (!entry) return "none";
		return entry.watched ? "watched" : "partial";
	}

	function getWatchEntry(ep: Series): WatchEntry | undefined {
		return watchHistory.find(
			(w) => w.season === ep.season && w.series === ep.seriesNum,
		);
	}

	// ── Play handlers: just open overlay ──

	function openPlayer(
		ep: Series,
		sId: number,
		pId: string,
		qual: string,
	) {
		usePlayerStore.getState().setPlayback({
			animeId,
			animeTitle,
			season: ep.season,
			episode: ep.seriesNum,
			seriesId: sId,
			privateId: pId,
			quality: qual,
		});
		setPickerState(null);
	}

	function playWithQuality(ep: Series, quality: QualityOption) {
		openPlayer(ep, quality.seriesId, quality.privateId, quality.quality);
	}

	function playDefault(ep: Series) {
		openPlayer(ep, ep.id, ep.privateId, ep.videoQuality);
	}

	async function handlePlay(ep: Series) {
		if (loadingEp === ep.seriesNum) return;

		setLoadingEp(ep.seriesNum);
		setPickerState(null);

		try {
			const qualities = await invoke<QualityOption[]>("get_qualities", {
				animeId,
				season: seasonNum,
				episode: ep.seriesNum,
			});

			if (qualities.length <= 1) {
				const q = qualities[0];
				if (q) {
					playWithQuality(ep, q);
				} else {
					playDefault(ep);
				}
			} else {
				setPickerState({ ep: ep.seriesNum, options: qualities });
			}
		} catch {
			playDefault(ep);
		} finally {
			setLoadingEp(null);
		}
	}

	useEffect(() => {
		if (!pickerState) return;
		const handler = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest("[data-quality-picker]")) {
				setPickerState(null);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [pickerState]);

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3">
				<h2 className="text-lg font-semibold text-text-primary">
					Эпизоды
				</h2>

				{seasonKeys.length > 1 && (
					<div className="flex gap-1 rounded-lg bg-bg-card p-1">
						{seasonKeys.map((key) => (
							<button
								key={key}
								type="button"
								onClick={() => setSelectedSeason(key)}
								className={`rounded-md px-3 py-1 text-xs font-medium transition-default ${
									selectedSeason === key
										? "bg-bg-elevated text-text-primary"
										: "text-text-muted hover:text-text-secondary"
								}`}
							>
								Сезон {key}
							</button>
						))}
					</div>
				)}

				<span className="text-xs text-text-muted">
					{episodes.length}{" "}
					{episodes.length === 1
						? "эпизод"
						: episodes.length < 5
							? "эпизода"
							: "эпизодов"}
				</span>
			</div>

			<div className="flex flex-col gap-1.5">
				{episodes.map((ep) => {
					const status = getWatchStatus(ep);
					const entry = getWatchEntry(ep);
					const isLoading = loadingEp === ep.seriesNum;
					const showPicker = pickerState?.ep === ep.seriesNum;
					const qualityLabel =
						QUALITIES[
							ep.videoQuality as keyof typeof QUALITIES
						] || ep.videoQuality;

					return (
						<div
							key={ep.id}
							className={`group relative flex items-center gap-3 rounded-lg border px-4 py-3 transition-default ${
								status === "watched"
									? "border-border-subtle bg-bg-card"
									: "border-border-subtle bg-bg-card hover:border-border hover:bg-bg-hover"
							}`}
						>
							<span className="w-8 shrink-0 text-center font-mono text-sm text-text-muted">
								{ep.seriesNum}
							</span>

							<span
								className={`flex-1 text-sm ${
									status === "watched"
										? "text-text-secondary"
										: "text-text-primary"
								}`}
							>
								Эпизод {ep.seriesNum}
							</span>

							{status === "partial" && entry && (
								<span className="hidden items-center gap-1 text-xs text-text-muted sm:flex">
									<Clock size={11} />
									{formatDuration(entry.timeSec)}
								</span>
							)}

							<span className="rounded bg-bg-elevated px-2 py-0.5 text-xs text-text-muted">
								{qualityLabel}
							</span>

							{status === "watched" && (
								<Check
									size={14}
									className="shrink-0 text-success"
								/>
							)}
							{status === "partial" && (
								<Clock
									size={14}
									className="shrink-0 text-warning"
								/>
							)}

							<div className="relative" data-quality-picker>
								<button
									type="button"
									onClick={() => handlePlay(ep)}
									disabled={isLoading}
									className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-default hover:bg-bg-active hover:text-text-primary disabled:opacity-50"
								>
									{isLoading ? (
										<Loader2
											size={14}
											className="animate-spin"
										/>
									) : (
										<Play
											size={14}
											className="fill-current"
										/>
									)}
								</button>

								{showPicker && pickerState && (
									<QualityPicker
										options={pickerState.options}
										onSelect={(q: QualityOption) =>
											playWithQuality(ep, q)
										}
									/>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}