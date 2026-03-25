import { useState, useEffect } from "react";
import { useMarathonStore, type MarathonStatus } from "../stores/marathon";
import {
	Pause,
	Play,
	Square,
	SkipForward,
	TrendingUp,
	Clock,
	Zap,
} from "lucide-react";

interface Props {
	status: MarathonStatus;
}

export function MarathonStatusBar({ status }: Props) {
	const { stop, pause, resume, skip, queue } = useMarathonStore();
	const [elapsed, setElapsed] = useState(0);

	// Ticking session timer
	useEffect(() => {
		if (!status.active || !status.sessionStartedAt) {
			setElapsed(0);
			return;
		}
		const tick = () => {
			setElapsed(
				Math.floor(Date.now() / 1000) - (status.sessionStartedAt ?? 0),
			);
		};
		tick();
		const interval = setInterval(tick, 1000);
		return () => clearInterval(interval);
	}, [status.active, status.sessionStartedAt]);

	// Remaining episodes estimate
	const remainingEps = queue
		.filter((q) => q.status === "queued" || q.status === "active")
		.reduce((sum, q) => {
			const end = q.endEp ?? q.totalEpisodes;
			const done = q.farmedCount;
			return sum + Math.max(0, end - q.startEp + 1 - done);
		}, 0);

	const eta =
		status.episodesPerHour > 0
			? Math.ceil((remainingEps / status.episodesPerHour) * 3600)
			: 0;

	if (!status.active) return null;

	return (
		<div className="rounded-xl border border-border bg-bg-card p-4">
			{/* Current episode + status text */}
			<div className="mb-4 flex items-center justify-between">
				<div className="flex items-center gap-3">
					{status.paused ? (
						<Pause className="h-5 w-5 text-yellow-400" />
					) : (
						<div className="relative flex h-5 w-5 items-center justify-center">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-30" />
							<span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400" />
						</div>
					)}
					<div className="flex flex-col">
						<div>
							<span className="text-sm font-medium text-text-primary">
								{status.currentAnime ?? "—"}
							</span>
							{status.currentSeason != null &&
								status.currentEpisode != null && (
									<span className="ml-2 text-xs text-text-secondary">
										S{status.currentSeason}E{status.currentEpisode}
									</span>
								)}
						</div>
						{/* ── STATUS TEXT (countdown during headless) ── */}
						{status.statusText && (
							<span className="mt-0.5 text-xs font-mono text-emerald-400">
								{status.statusText}
							</span>
						)}
					</div>
				</div>

				{status.paused && (
					<span className="rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
						Пауза
					</span>
				)}
			</div>

			{/* Stats row */}
			<div className="mb-4 grid grid-cols-4 gap-3">
				<Stat
					icon={<Zap className="h-3.5 w-3.5" />}
					label="Нафармлено"
					value={`${status.totalFarmed} эп.`}
				/>
				<Stat
					icon={<TrendingUp className="h-3.5 w-3.5" />}
					label="Скорость"
					value={`${status.episodesPerHour.toFixed(1)} эп/ч`}
				/>
				<Stat
					icon={<Clock className="h-3.5 w-3.5" />}
					label="Время"
					value={formatTimer(elapsed)}
					mono
				/>
				<Stat
					icon={<Clock className="h-3.5 w-3.5" />}
					label="ETA"
					value={eta > 0 ? formatEta(eta) : "—"}
				/>
			</div>

			{/* Controls */}
			<div className="flex items-center gap-2">
				{status.paused ? (
					<ControlBtn
						onClick={resume}
						icon={<Play className="h-4 w-4" />}
						label="Продолжить"
						primary
					/>
				) : (
					<ControlBtn
						onClick={pause}
						icon={<Pause className="h-4 w-4" />}
						label="Пауза"
					/>
				)}
				<ControlBtn
					onClick={stop}
					icon={<Square className="h-4 w-4" />}
					label="Стоп"
					danger
				/>
				<ControlBtn
					onClick={skip}
					icon={<SkipForward className="h-4 w-4" />}
					label="Пропустить"
				/>
			</div>
		</div>
	);
}

// ═══════════════════════════════════════

function Stat({
	icon,
	label,
	value,
	mono,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	mono?: boolean;
}) {
	return (
		<div className="rounded-lg bg-bg-root px-3 py-2">
			<div className="mb-1 flex items-center gap-1.5 text-text-muted">
				{icon}
				<span className="text-[10px] uppercase tracking-wider">{label}</span>
			</div>
			<div
				className={`text-sm font-medium text-text-primary ${mono ? "font-mono" : ""}`}
			>
				{value}
			</div>
		</div>
	);
}

function ControlBtn({
	onClick,
	icon,
	label,
	primary,
	danger,
}: {
	onClick: () => void;
	icon: React.ReactNode;
	label: string;
	primary?: boolean;
	danger?: boolean;
}) {
	let cls =
		"flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ";
	if (primary) {
		cls += "bg-white text-black hover:bg-[#ccc]";
	} else if (danger) {
		cls += "border border-red-500/30 text-red-400 hover:bg-red-500/10";
	} else {
		cls += "border border-border text-text-secondary hover:border-[#333] hover:text-text-primary";
	}

	return (
		<button type="button" onClick={onClick} className={cls}>
			{icon}
			{label}
		</button>
	);
}

function formatTimer(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

function formatEta(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (h > 0) return `~${h}ч ${m}м`;
	return `~${m}м`;
}
