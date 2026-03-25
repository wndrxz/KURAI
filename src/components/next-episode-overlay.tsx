interface NextEpisodeOverlayProps {
	countdown: number;
	onNext: () => void;
	onCancel: () => void;
}

export function NextEpisodeOverlay({
	countdown,
	onNext,
	onCancel,
}: NextEpisodeOverlayProps) {
	return (
		<div className="animate-fade-in-up flex items-center gap-2.5">
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onCancel();
				}}
				className="rounded-lg px-4 py-2 text-sm text-white/60 transition-default hover:bg-white/10 hover:text-white"
			>
				Отмена
			</button>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onNext();
				}}
				className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-default hover:bg-white/85"
			>
				Следующий эпизод
				{countdown > 0 && (
					<span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black/15 px-1 font-mono text-xs font-bold">
						{countdown}
					</span>
				)}
			</button>
		</div>
	);
}