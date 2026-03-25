import { Routes, Route, Navigate } from "react-router";
import { useEffect } from "react";
import { useAuthStore } from "./stores/auth";
import { useSettingsStore } from "./stores/settings";
import { AppShell } from "./components/layout/app-shell";
import { Titlebar } from "./components/layout/titlebar";
import { ToastContainer } from "./components/toast";
import LoginPage from "./pages/login";
import HomePage from "./pages/home";
import CatalogPage from "./pages/catalog";
import AnimePage from "./pages/anime";
import MarathonPage from "./pages/marathon";
import HistoryPage from "./pages/history";
import CollectionsPage from "./pages/collections";
import SettingsPage from "./pages/settings";

export default function App() {
	const isLoading = useAuthStore((s) => s.isLoading);
	const user = useAuthStore((s) => s.user);
	const checkAuth = useAuthStore((s) => s.checkAuth);
	const loadSettings = useSettingsStore((s) => s.loadFromDb);

	useEffect(() => {
		checkAuth();
		loadSettings();
	}, [checkAuth, loadSettings]);

	if (isLoading) {
		return (
			<div className="flex h-screen flex-col bg-bg-root">
				<Titlebar />
				<div className="flex flex-1 items-center justify-center">
					<h1 className="animate-pulse text-3xl font-bold tracking-tighter text-text-primary">
						KURAI
					</h1>
				</div>
			</div>
		);
	}

	return (
		<>
			<ToastContainer />
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route
					path="/*"
					element={
						user ? (
							<AppShell>
								<Routes>
									<Route path="/" element={<HomePage />} />
									<Route
										path="/catalog"
										element={<CatalogPage />}
									/>
									<Route
										path="/anime/:id"
										element={<AnimePage />}
									/>
									<Route
										path="/marathon"
										element={<MarathonPage />}
									/>
									<Route
										path="/history"
										element={<HistoryPage />}
									/>
									<Route
										path="/collections"
										element={<CollectionsPage />}
									/>
									<Route
										path="/settings"
										element={<SettingsPage />}
									/>
									<Route
										path="*"
										element={<Navigate to="/" replace />}
									/>
								</Routes>
							</AppShell>
						) : (
							<Navigate to="/login" replace />
						)
					}
				/>
			</Routes>
		</>
	);
}