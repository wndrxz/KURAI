import { useState, useCallback } from "react";
import { useMarathonStore, type QueueItem } from "../stores/marathon";
import { GripVertical, X } from "lucide-react";

interface Props {
	items: QueueItem[];
	isRunning: boolean;
}

export function MarathonQueue({ items, isRunning }: Props) {
	const { removeFromQueue, reorder } = useMarathonStore();
	const [dragId, setDragId] = useState<number | null>(null);
	const [dragOverId, setDragOverId] = useState<number | null>(null);

	const handleDragStart = useCallback(
		(e: React.DragEvent, id: number) => {
			if (isRunning) {
				e.preventDefault();
				return;
			}
			setDragId(id);
			e.dataTransfer.effectAllowed = "move";
			// Make drag image slightly transparent
			if (e.currentTarget instanceof HTMLElement) {
				e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
			}
		},
		[isRunning],
	);

	const handleDragOver = useCallback(
		(e: React.DragEvent, id: number) => {
			e.preventDefault();
			e.dataTransfer.dropEffect = "move";
			setDragOverId(id);
		},
		[],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent, targetItem: QueueItem) => {
			e.preventDefault();
			if (dragId !== null && dragId !== targetItem.id) {
				reorder(dragId, targetItem.position);
			}
			setDragId(null);
			setDragOverId(null);
		},
		[dragId, reorder],
	);

	const handleDragEnd = useCallback(() => {
		setDragId(null);
		setDragOverId(null);
	}, []);

	return (
		<div className="space-y-1.5">
			{items.map((item) => {
				const isDragging = dragId === item.id;
				const isDragOver =
					dragOverId === item.id && dragId !== item.id;
				const end = item.endEp ?? item.totalEpisodes;
				const progress = item.farmedCount;
				const total = end - item.startEp + 1;
				const pct =
					total > 0
						? Math.min(100, Math.round((progress / total) * 100))
						: 0;

				return (
					<div
						key={item.id}
						draggable={!isRunning}
						onDragStart={(e) => handleDragStart(e, item.id)}
						onDragOver={(e) => handleDragOver(e, item.id)}
						onDrop={(e) => handleDrop(e, item)}
						onDragEnd={handleDragEnd}
						className={`
							group flex items-center gap-3 rounded-lg border px-3 py-2.5
							transition-all duration-150
							${isDragging ? "opacity-40" : "opacity-100"}
							${isDragOver ? "border-white/30 bg-bg-hover" : "border-border bg-bg-card"}
						`}
					>
						{/* Drag handle */}
						{!isRunning && (
							<GripVertical className="h-4 w-4 shrink-0 cursor-grab text-text-muted active:cursor-grabbing" />
						)}

						{/* Status dot */}
						<StatusDot status={item.status} />

						{/* Title + progress */}
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<span className="truncate text-sm font-medium text-text-primary">
									{item.animeTitle}
								</span>
								<StatusBadge status={item.status} />
							</div>

							{/* Progress bar */}
							<div className="mt-1.5 flex items-center gap-2">
								<div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-root">
									<div
										className="h-full rounded-full bg-white/60 transition-all"
										style={{ width: `${pct}%` }}
									/>
								</div>
								<span className="shrink-0 font-mono text-[11px] text-text-muted">
									{progress}/{total}
								</span>
							</div>
						</div>

						{/* Remove button */}
						{!isRunning && (
							<button
								type="button"
								onClick={() => removeFromQueue(item.id)}
								className="shrink-0 rounded p-1 text-text-muted opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
							>
								<X className="h-4 w-4" />
							</button>
						)}
					</div>
				);
			})}
		</div>
	);
}

function StatusDot({ status }: { status: string }) {
	const colors: Record<string, string> = {
		active: "bg-emerald-400",
		queued: "bg-text-muted",
		paused: "bg-yellow-400",
		done: "bg-emerald-600",
		error: "bg-red-400",
	};

	return (
		<span
			className={`h-2 w-2 shrink-0 rounded-full ${colors[status] ?? "bg-text-muted"}`}
		/>
	);
}

function StatusBadge({ status }: { status: string }) {
	if (status === "queued") return null;

	const styles: Record<string, string> = {
		active: "bg-emerald-500/15 text-emerald-400",
		paused: "bg-yellow-500/15 text-yellow-400",
		done: "bg-emerald-500/15 text-emerald-500",
		error: "bg-red-500/15 text-red-400",
	};

	const labels: Record<string, string> = {
		active: "активно",
		paused: "пауза",
		done: "готово",
		error: "ошибка",
	};

	return (
		<span
			className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${styles[status] ?? ""}`}
		>
			{labels[status] ?? status}
		</span>
	);
}