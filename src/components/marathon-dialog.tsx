import { useState } from "react";
import { X, Zap } from "lucide-react";
import type { Anime } from "../lib/types";
import { useMarathonStore } from "../stores/marathon";
import { showToast } from "./toast";

interface MarathonDialogProps {
	anime: Anime;
	totalEpisodes: number;
	onClose: () => void;
}

export function MarathonDialog({
	anime,
	totalEpisodes,
	onClose,
}: MarathonDialogProps) {
	const [startEp, setStartEp] = useState(1);
	const [endEp, setEndEp] = useState(totalEpisodes);
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const addToQueue = useMarathonStore((s) => s.addToQueue);

	const count = Math.max(0, endEp - startEp + 1);

	const handleSubmit = async () => {
		if (startEp < 1 || startEp > totalEpisodes) {
			setErrorMsg("Неверный начальный эпизод");
			return;
		}
		if (endEp < startEp || endEp > totalEpisodes) {
			setErrorMsg("Неверный конечный эпизод");
			return;
		}

		setLoading(true);
		setErrorMsg(null);

		try {
			await addToQueue(
				anime.id,
				anime.name,
				totalEpisodes,
				startEp,
				endEp < totalEpisodes ? endEp : undefined,
			);
			showToast(`Добавлено в марафон: ${count} эп.`, "success");
			onClose();
		} catch (err: unknown) {
			const msg =
				err instanceof Error
					? err.message
					: typeof err === "string"
						? err
						: "Неизвестная ошибка";
			setErrorMsg(msg);
			showToast("Не удалось добавить в марафон", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<button
				type="button"
				className="absolute inset-0 bg-black/60"
				onClick={onClose}
				aria-label="Закрыть"
			/>

			{/* Dialog */}
			<div className="relative w-full max-w-sm rounded-xl border border-border bg-bg-elevated p-6">
				<button
					type="button"
					onClick={onClose}
					className="absolute top-4 right-4 text-text-muted transition-default hover:text-text-secondary"
				>
					<X size={16} />
				</button>

				<div className="mb-5 flex items-center gap-2">
					<Zap size={18} className="text-warning" />
					<h3 className="text-base font-semibold text-text-primary">
						Добавить в марафон
					</h3>
				</div>

				<p className="mb-4 line-clamp-2 text-sm text-text-secondary">
					{anime.name}
				</p>

				<p className="mb-4 text-xs text-text-muted">
					Всего эпизодов: {totalEpisodes}
				</p>

				{/* Range inputs */}
				<div className="mb-5 flex gap-3">
					<div className="flex-1">
						<label
							htmlFor="marathon-start-ep"
							className="mb-1 block text-xs text-text-muted"
						>
							С эпизода
						</label>
						<input
							id="marathon-start-ep"
							type="number"
							min={1}
							max={totalEpisodes}
							value={startEp}
							onChange={(e) => {
								setStartEp(
									Math.max(1, Number(e.target.value) || 1),
								);
								setErrorMsg(null);
							}}
							className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-text-primary outline-none transition-default focus:border-text-muted"
						/>
					</div>
					<div className="flex-1">
						<label
							htmlFor="marathon-end-ep"
							className="mb-1 block text-xs text-text-muted"
						>
							По эпизод
						</label>
						<input
							id="marathon-end-ep"
							type="number"
							min={startEp}
							max={totalEpisodes}
							value={endEp}
							onChange={(e) => {
								setEndEp(
									Math.min(
										totalEpisodes,
										Number(e.target.value) ||
											totalEpisodes,
									),
								);
								setErrorMsg(null);
							}}
							className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-text-primary outline-none transition-default focus:border-text-muted"
						/>
					</div>
				</div>

				{/* Count */}
				<p className="mb-2 text-center text-xs text-text-muted">
					Будет добавлено: {count} эп.
				</p>

				{/* Error */}
				{errorMsg && (
					<p className="mb-3 rounded-md bg-error/10 px-3 py-2 text-center text-xs text-error">
						{errorMsg}
					</p>
				)}

				{/* Actions */}
				<div className="flex gap-3">
					<button
						type="button"
						onClick={onClose}
						className="flex-1 rounded-lg border border-border bg-bg-card py-2.5 text-sm text-text-secondary transition-default hover:bg-bg-hover"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						disabled={loading || count <= 0}
						className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-medium text-black transition-default hover:bg-accent-hover disabled:opacity-50"
					>
						{loading ? "Добавление..." : "Добавить"}
					</button>
				</div>
			</div>
		</div>
	);
}