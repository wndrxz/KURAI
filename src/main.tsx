import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import App from "./App";
import "./app.css";

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(
		<StrictMode>
			<HashRouter>
				<App />
			</HashRouter>
		</StrictMode>,
	);
}