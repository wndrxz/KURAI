import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

const appWindow = getCurrentWindow();

export function Titlebar() {
	return (
		<header className="flex h-8 shrink-0 select-none items-center bg-bg-root">
			{/* Drag region — fills available space */}
			<div
				data-tauri-drag-region
				className="flex h-full flex-1 items-center pl-3"
			>
				<span className="pointer-events-none text-[11px] font-semibold tracking-widest text-text-muted">
					KURAI
				</span>
			</div>

			{/* Window controls — outside drag region so they stay interactive */}
			<div className="flex h-full">
				<button
					type="button"
					onClick={() => appWindow.minimize()}
					className="inline-flex h-full w-[46px] items-center justify-center text-text-muted transition-colors duration-150 hover:bg-bg-hover hover:text-text-secondary"
				>
					<Minus size={14} />
				</button>

				<button
					type="button"
					onClick={() => appWindow.toggleMaximize()}
					className="inline-flex h-full w-[46px] items-center justify-center text-text-muted transition-colors duration-150 hover:bg-bg-hover hover:text-text-secondary"
				>
					<Square size={11} />
				</button>

				<button
					type="button"
					onClick={() => appWindow.close()}
					className="inline-flex h-full w-[46px] items-center justify-center text-text-muted transition-colors duration-150 hover:bg-[#c42b1c] hover:text-white"
				>
					<X size={14} />
				</button>
			</div>
		</header>
	);
}