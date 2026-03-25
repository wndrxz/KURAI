import type { QualityOption } from "../lib/types";

interface QualityPickerProps {
	options: QualityOption[];
	onSelect: (option: QualityOption) => void;
}

export function QualityPicker({ options, onSelect }: QualityPickerProps) {
	// Sort: 4K → 1440p → 1080p
	const sorted = [...options].sort((a, b) => {
		const order: Record<string, number> = {
			ULTRA_HD: 0,
			QHD: 1,
			FULL_HD: 2,
		};
		return (order[a.quality] ?? 9) - (order[b.quality] ?? 9);
	});

	return (
		<div
			data-quality-picker
			className="absolute right-0 top-full z-20 mt-1 min-w-30 rounded-lg border border-border bg-bg-elevated p-1 shadow-lg"
		>
			<p className="px-2 py-1 text-xs text-text-muted">Качество</p>
			{sorted.map((q) => (
				<button
					key={q.seriesId}
					type="button"
					onClick={() => onSelect(q)}
					className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-text-primary transition-default hover:bg-bg-hover"
				>
					{q.label}
				</button>
			))}
		</div>
	);
}