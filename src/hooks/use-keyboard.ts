import { useEffect, useMemo } from "react";
import { useSettingsStore } from "../stores/settings";

type KeyHandler = (e: KeyboardEvent) => void;

const IGNORE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function buildCombo(e: KeyboardEvent): string {
	const parts: string[] = [];
	if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
	if (e.shiftKey) parts.push("Shift");
	if (e.altKey) parts.push("Alt");
	parts.push(e.key);
	return parts.join("+");
}

function shouldIgnore(e: KeyboardEvent): boolean {
	const tag = (e.target as HTMLElement)?.tagName;
	if (tag && IGNORE_TAGS.has(tag)) return true;
	if ((e.target as HTMLElement)?.isContentEditable) return true;
	return false;
}

/** Raw key-combo handlers (backward compatible) */
export function useKeyboard(handlers: Record<string, KeyHandler>) {
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (shouldIgnore(e)) return;
			const combo = buildCombo(e);

			if (handlers[combo]) {
				e.preventDefault();
				e.stopPropagation();
				handlers[combo](e);
			} else if (
				handlers[e.key] &&
				!e.ctrlKey &&
				!e.metaKey &&
				!e.shiftKey &&
				!e.altKey
			) {
				e.preventDefault();
				e.stopPropagation();
				handlers[e.key](e);
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handlers]);
}

/** Configurable hotkey handlers — reads mappings from settings store */
export function useHotkeys(handlers: Record<string, () => void>) {
	const hotkeys = useSettingsStore((s) => s.hotkeys);

	// Reverse map: keyCombo → actionName
	const reverseMap = useMemo(() => {
		const map: Record<string, string> = {};
		for (const [action, combo] of Object.entries(hotkeys)) {
			map[combo] = action;
		}
		return map;
	}, [hotkeys]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (shouldIgnore(e)) return;
			const combo = buildCombo(e);
			const action = reverseMap[combo];
			if (action && handlers[action]) {
				e.preventDefault();
				e.stopPropagation();
				handlers[action]();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handlers, reverseMap]);
}

/** Format a key combo for display */
export function formatHotkey(combo: string): string {
	return combo
		.replace("ArrowLeft", "←")
		.replace("ArrowRight", "→")
		.replace("ArrowUp", "↑")
		.replace("ArrowDown", "↓")
		.replace(" ", "Space")
		.replace("Escape", "Esc");
}