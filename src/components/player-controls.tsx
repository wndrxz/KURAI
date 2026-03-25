// src/components/player-controls.tsx

import { useState, useRef, useCallback, useEffect } from "react";
import {
	Play,
	Pause,
	Volume2,
	VolumeX,
	Volume1,
	Maximize,
	Minimize,
	SkipForward,
	SkipBack,
	Settings,
	Check,
} from "lucide-react";
import type { QualityOption } from "../stores/player";
import { QUALITIES } from "../lib/constants";

function formatTime(sec: number): string {
	if (!sec || !Number.isFinite(sec)) return "0:00";
	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	const s = Math.floor(sec % 60);
	const ss = s.toString().padStart(2, "0");
	return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

interface PlayerControlsProps {
	currentTime: number;
	duration: number;
	buffered: number;
	paused: boolean;
	volume: number;
	muted: boolean;
	isFullscreen: boolean;
	quality: string;
	qualities: QualityOption[];
	hasNext: boolean;
	hasPrev: boolean;
	onTogglePlay: () => void;
	onSeek: (time: number) => void;
	onSetVolume: (vol: number) => void;
	onToggleMute: () => void;
	onToggleFullscreen: () => void;
	onSwitchQuality: (q: QualityOption) => void;
	onNext: () => void;
	onPrev: () => void;
}

export function PlayerControls({
	currentTime,
	duration,
	buffered,
	paused,
	volume,
	muted,
	isFullscreen,
	quality,
	qualities,
	hasNext,
	hasPrev,
	onTogglePlay,
	onSeek,
	onSetVolume,
	onToggleMute,
	onToggleFullscreen,
	onSwitchQuality,
	onNext,
	onPrev,
}: PlayerControlsProps) {
	// ═══════════════════════════════════
	// SEEKBAR
	// ═══════════════════════════════════

	const seekRef = useRef<HTMLDivElement>(null);
	const [seeking, setSeeking] = useState(false);
	const [seekHover, setSeekHover] = useState(false);
	const [hoverTime, setHoverTime] = useState(0);
	const [hoverX, setHoverX] = useState(0);

	const getTimeFromEvent = useCallback(
		(e: React.MouseEvent | MouseEvent) => {
			const bar = seekRef.current;
			if (!bar || !duration) return 0;
			const rect = bar.getBoundingClientRect();
			const ratio = Math.max(
				0,
				Math.min(1, (e.clientX - rect.left) / rect.width),
			);
			return ratio * duration;
		},
		[duration],
	);

	const onSeekMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setSeeking(true);
			onSeek(getTimeFromEvent(e));
		},
		[getTimeFromEvent, onSeek],
	);

	useEffect(() => {
		if (!seeking) return;

		const onMove = (e: MouseEvent) => {
			onSeek(getTimeFromEvent(e));
		};
		const onUp = () => setSeeking(false);

		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
	}, [seeking, getTimeFromEvent, onSeek]);

	const onSeekHover = useCallback(
		(e: React.MouseEvent) => {
			const bar = seekRef.current;
			if (!bar || !duration) return;
			const rect = bar.getBoundingClientRect();
			const ratio = Math.max(
				0,
				Math.min(1, (e.clientX - rect.left) / rect.width),
			);
			setHoverTime(ratio * duration);
			setHoverX(e.clientX - rect.left);
		},
		[duration],
	);

	const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
	const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

	// ═══════════════════════════════════
	// VOLUME SLIDER
	// ═══════════════════════════════════

	const volRef = useRef<HTMLDivElement>(null);
	const [volDragging, setVolDragging] = useState(false);
	const [showVolume, setShowVolume] = useState(false);

	const getVolFromEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
		const bar = volRef.current;
		if (!bar) return 0;
		const rect = bar.getBoundingClientRect();
		return Math.max(
			0,
			Math.min(1, (e.clientX - rect.left) / rect.width),
		);
	}, []);

	const onVolMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setVolDragging(true);
			onSetVolume(getVolFromEvent(e));
		},
		[getVolFromEvent, onSetVolume],
	);

	useEffect(() => {
		if (!volDragging) return;

		const onMove = (e: MouseEvent) => onSetVolume(getVolFromEvent(e));
		const onUp = () => setVolDragging(false);

		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
	}, [volDragging, getVolFromEvent, onSetVolume]);

	const effectiveVol = muted ? 0 : volume;

	const VolumeIcon =
		muted || volume === 0
			? VolumeX
			: volume < 0.5
				? Volume1
				: Volume2;

	// ═══════════════════════════════════
	// QUALITY PICKER
	// ═══════════════════════════════════

	const [showQuality, setShowQuality] = useState(false);
	const qualRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!showQuality) return;
		const handler = (e: MouseEvent) => {
			if (
				qualRef.current &&
				!qualRef.current.contains(e.target as Node)
			) {
				setShowQuality(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [showQuality]);

	const sortedQualities = [...qualities].sort((a, b) => {
		const order: Record<string, number> = {
			ULTRA_HD: 0,
			QHD: 1,
			FULL_HD: 2,
		};
		return (order[a.quality] ?? 9) - (order[b.quality] ?? 9);
	});

	const currentQualityLabel =
		QUALITIES[quality as keyof typeof QUALITIES] || quality;

	// ═══════════════════════════════════
	// RENDER
	// ═══════════════════════════════════

	return (
		<div
			className="flex flex-col gap-2 px-4 pb-4"
			onClick={(e) => e.stopPropagation()}
			onKeyDown={(e) => e.stopPropagation()}
		>
			{/* ── Seekbar ── */}
			<div
				ref={seekRef}
				className="group relative h-5 cursor-pointer"
				onMouseDown={onSeekMouseDown}
				onMouseEnter={() => setSeekHover(true)}
				onMouseLeave={() => setSeekHover(false)}
				onMouseMove={onSeekHover}
			>
				{/* Track background */}
				<div className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 rounded-full bg-white/20 transition-all group-hover:h-1.5">
					{/* Buffered */}
					<div
						className="absolute inset-y-0 left-0 rounded-full bg-white/30"
						style={{ width: `${bufferedPct}%` }}
					/>
					{/* Progress */}
					<div
						className="absolute inset-y-0 left-0 rounded-full bg-white"
						style={{ width: `${progress}%` }}
					/>
				</div>

				{/* Thumb */}
				<div
					className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-transform ${
						seeking || seekHover
							? "scale-100"
							: "scale-0"
					}`}
					style={{ left: `${progress}%` }}
				/>

				{/* Hover time tooltip */}
				{seekHover && !seeking && duration > 0 && (
					<div
						className="absolute bottom-full mb-2 -translate-x-1/2 rounded bg-black/80 px-2 py-0.5 text-xs font-mono text-white"
						style={{
							left: `${Math.max(20, Math.min(hoverX, (seekRef.current?.clientWidth ?? 200) - 20))}px`,
						}}
					>
						{formatTime(hoverTime)}
					</div>
				)}
			</div>

			{/* ── Button row ── */}
			<div className="flex items-center gap-1">
				{/* Play / Pause */}
				<CtrlBtn
					onClick={onTogglePlay}
					label={paused ? "Play" : "Pause"}
				>
					{paused ? (
						<Play size={20} className="fill-current" />
					) : (
						<Pause size={20} className="fill-current" />
					)}
				</CtrlBtn>

				{/* Prev */}
				<CtrlBtn
					onClick={onPrev}
					disabled={!hasPrev}
					label="Previous episode"
				>
					<SkipBack size={18} className="fill-current" />
				</CtrlBtn>

				{/* Next */}
				<CtrlBtn
					onClick={onNext}
					disabled={!hasNext}
					label="Next episode"
				>
					<SkipForward size={18} className="fill-current" />
				</CtrlBtn>

				{/* Volume */}
				<div
					className="relative flex items-center"
					onMouseEnter={() => setShowVolume(true)}
					onMouseLeave={() => {
						if (!volDragging) setShowVolume(false);
					}}
				>
					<CtrlBtn onClick={onToggleMute} label="Mute">
						<VolumeIcon size={18} />
					</CtrlBtn>

					{/* Volume slider */}
					<div
						className={`flex items-center overflow-hidden transition-all duration-200 ${
							showVolume || volDragging
								? "ml-1 w-20 opacity-100"
								: "w-0 opacity-0"
						}`}
					>
						<div
							ref={volRef}
							className="group relative h-5 w-full cursor-pointer"
							onMouseDown={onVolMouseDown}
						>
							<div className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 rounded-full bg-white/20">
								<div
									className="absolute inset-y-0 left-0 rounded-full bg-white"
									style={{
										width: `${effectiveVol * 100}%`,
									}}
								/>
							</div>
							<div
								className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
								style={{
									left: `${effectiveVol * 100}%`,
								}}
							/>
						</div>
					</div>
				</div>

				{/* Time display */}
				<span className="ml-2 font-mono text-xs text-white/70 select-none">
					{formatTime(currentTime)}
					<span className="text-white/40">
						{" / "}
						{formatTime(duration)}
					</span>
				</span>

				{/* Spacer */}
				<div className="flex-1" />

				{/* Quality */}
				{sortedQualities.length > 1 && (
					<div ref={qualRef} className="relative">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setShowQuality(!showQuality);
							}}
							className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-white/70 transition-default hover:bg-white/10 hover:text-white"
						>
							<Settings size={14} />
							{currentQualityLabel}
						</button>

						{showQuality && (
							<div className="absolute right-0 bottom-full mb-2 min-w-32 rounded-lg border border-white/10 bg-black/90 p-1 backdrop-blur-xl">
								<p className="px-2.5 py-1 text-[11px] text-white/40">
									Качество
								</p>
								{sortedQualities.map((q) => (
									<button
										key={q.seriesId}
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onSwitchQuality(q);
											setShowQuality(false);
										}}
										className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-default hover:bg-white/10 ${
											q.quality === quality
												? "text-white"
												: "text-white/60"
										}`}
									>
										{q.quality === quality && (
											<Check
												size={12}
												className="shrink-0"
											/>
										)}
										<span
											className={
												q.quality === quality
													? ""
													: "ml-5"
											}
										>
											{q.label}
										</span>
									</button>
								))}
							</div>
						)}
					</div>
				)}

				{/* Single quality badge */}
				{sortedQualities.length <= 1 && (
					<span className="rounded-md px-2 py-1 text-xs text-white/40">
						{currentQualityLabel}
					</span>
				)}

				{/* Fullscreen */}
				<CtrlBtn
					onClick={onToggleFullscreen}
					label="Fullscreen"
				>
					{isFullscreen ? (
						<Minimize size={18} />
					) : (
						<Maximize size={18} />
					)}
				</CtrlBtn>
			</div>
		</div>
	);
}

// ═══════════════════════════════════
// CONTROL BUTTON
// ═══════════════════════════════════

function CtrlBtn({
	children,
	onClick,
	disabled,
	label,
}: {
	children: React.ReactNode;
	onClick: () => void;
	disabled?: boolean;
	label: string;
}) {
	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onClick();
			}}
			disabled={disabled}
			aria-label={label}
			className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition-default hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
		>
			{children}
		</button>
	);
}