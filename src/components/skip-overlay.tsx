import type { SkipMark } from "../stores/player";

interface SkipOverlayProps {
	mark: SkipMark;
	onSkip: () => void;
	onWatch: () => void;
}

export function SkipOverlay({ mark, onSkip, onWatch }: SkipOverlayProps) {
	const label =
		mark.label === "Опенинг"
			? "опенинг"
			: mark.label === "Эндинг"
				? "эндинг"
				: mark.label.toLowerCase();

	return (
		<div className="animate-fade-in-up flex items-center gap-2.5">
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onWatch();
				}}
				className="rounded-lg px-4 py-2 text-sm text-white/60 transition-default hover:bg-white/10 hover:text-white"
			>
				Смотреть
			</button>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onSkip();
				}}
				className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-default hover:bg-white/85"
			>
				Пропустить {label}
			</button>
		</div>
	);
}