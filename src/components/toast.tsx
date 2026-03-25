import { useEffect, useState } from "react";
import { X } from "lucide-react";

export interface ToastData {
	id: string;
	message: string;
	type: "success" | "error" | "info";
}

let toastListeners: ((toast: ToastData) => void)[] = [];

export function showToast(message: string, type: ToastData["type"] = "info") {
	const toast: ToastData = {
		id: Date.now().toString(),
		message,
		type,
	};
	for (const fn of toastListeners) fn(toast);
}

export function ToastContainer() {
	const [toasts, setToasts] = useState<ToastData[]>([]);

	useEffect(() => {
		const handler = (toast: ToastData) => {
			setToasts((prev) => [...prev, toast]);
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== toast.id));
			}, 4000);
		};
		toastListeners.push(handler);
		return () => {
			toastListeners = toastListeners.filter((fn) => fn !== handler);
		};
	}, []);

	const colorMap = {
		success: "border-success",
		error: "border-error",
		info: "border-text-muted",
	};

	return (
		<div className="pointer-events-none fixed top-12 right-4 z-50 flex flex-col gap-2">
			{toasts.map((t) => (
				<div
					key={t.id}
					className={`pointer-events-auto flex items-center gap-3 rounded-lg border bg-bg-elevated px-4 py-3 text-sm shadow-lg ${colorMap[t.type]}`}
				>
					<span className="text-text-primary">{t.message}</span>
					<button
						type="button"
						onClick={() =>
							setToasts((prev) => prev.filter((x) => x.id !== t.id))
						}
						className="text-text-muted hover:text-text-secondary"
					>
						<X size={14} />
					</button>
				</div>
			))}
		</div>
	);
}