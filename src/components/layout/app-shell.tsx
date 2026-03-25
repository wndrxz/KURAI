import { Titlebar } from "./titlebar";
import { Sidebar } from "./sidebar";
import { PlayerOverlay } from "../player-overlay";
import { useMarathonEvents } from "../../hooks/use-marathon";

export function AppShell({ children }: { children: React.ReactNode }) {
	useMarathonEvents();

	return (
		<div className="flex h-screen flex-col bg-bg-root">
			<Titlebar />
			<div className="flex flex-1 overflow-hidden">
				<Sidebar />
				<main className="flex-1 overflow-y-auto p-6">
					{children}
				</main>
			</div>
			<PlayerOverlay />
		</div>
	);
}