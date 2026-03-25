import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Lang } from "../lib/i18n";

export type SkipMode = "auto" | "button" | "off";
export type MarathonMode = "headless" | "video";

export const DEFAULT_HOTKEYS: Record<string, string> = {
	"player.playPause": " ",
	"player.seekBack": "ArrowLeft",
	"player.seekForward": "ArrowRight",
	"player.seekBackLong": "Shift+ArrowLeft",
	"player.seekForwardLong": "Shift+ArrowRight",
	"player.volumeUp": "ArrowUp",
	"player.volumeDown": "ArrowDown",
	"player.mute": "m",
	"player.fullscreen": "f",
	"player.nextEp": "n",
	"player.prevEp": "p",
	"player.skip": "s",
	"hotkey.search": "Ctrl+k",
	"hotkey.settings": "Ctrl+,",
};

async function persist(key: string, value: string) {
	try {
		await invoke("set_setting", { key, value });
	} catch {
		/* silent */
	}
}

interface SettingsState {
	// UI
	sidebarCollapsed: boolean;
	language: Lang;

	// Player
	defaultQuality: string;
	autoNextEpisode: boolean;
	nextEpCountdown: number;
	skipMode: SkipMode;
	skipButtonTimeout: number;

	// Marathon
	marathonDelayMin: number;
	marathonDelayMax: number;
	marathonMode: MarathonMode;
	marathonQuality: string;

	// App
	closeToTray: boolean;
	autostart: boolean;
	systemNotifications: boolean;

	// Hotkeys
	hotkeys: Record<string, string>;

	// Actions
	toggleSidebar: () => void;
	setSidebarCollapsed: (v: boolean) => void;
	setLanguage: (l: Lang) => void;
	setDefaultQuality: (q: string) => void;
	setAutoNextEpisode: (v: boolean) => void;
	setNextEpCountdown: (v: number) => void;
	setSkipMode: (m: SkipMode) => void;
	setSkipButtonTimeout: (v: number) => void;
	setMarathonDelayMin: (v: number) => void;
	setMarathonDelayMax: (v: number) => void;
	setMarathonMode: (m: MarathonMode) => void;
	setMarathonQuality: (q: string) => void;
	setCloseToTray: (v: boolean) => void;
	setAutostart: (v: boolean) => void;
	setSystemNotifications: (v: boolean) => void;
	setHotkey: (action: string, combo: string) => void;
	resetHotkeys: () => void;
	loadFromDb: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
	sidebarCollapsed: false,
	language: "ru",
	defaultQuality: "FULL_HD",
	autoNextEpisode: true,
	nextEpCountdown: 5,
	skipMode: "button",
	skipButtonTimeout: 7,
	marathonDelayMin: 10,
	marathonDelayMax: 30,
	marathonMode: "headless",
	marathonQuality: "FULL_HD",
	closeToTray: false,
	autostart: false,
	systemNotifications: true,
	hotkeys: { ...DEFAULT_HOTKEYS },

	toggleSidebar: () => {
		const next = !get().sidebarCollapsed;
		set({ sidebarCollapsed: next });
		persist("sidebar_collapsed", String(next));
	},
	setSidebarCollapsed: (sidebarCollapsed) => {
		set({ sidebarCollapsed });
		persist("sidebar_collapsed", String(sidebarCollapsed));
	},
	setLanguage: (language) => {
		set({ language });
		persist("language", language);
	},
	setDefaultQuality: (defaultQuality) => {
		set({ defaultQuality });
		persist("default_quality", defaultQuality);
	},
	setAutoNextEpisode: (autoNextEpisode) => {
		set({ autoNextEpisode });
		persist("auto_next_episode", String(autoNextEpisode));
	},
	setNextEpCountdown: (nextEpCountdown) => {
		set({ nextEpCountdown });
		persist("next_ep_countdown", String(nextEpCountdown));
	},
	setSkipMode: (skipMode) => {
		set({ skipMode });
		persist("skip_mode", skipMode);
	},
	setSkipButtonTimeout: (skipButtonTimeout) => {
		set({ skipButtonTimeout });
		persist("skip_button_timeout", String(skipButtonTimeout));
	},
	setMarathonDelayMin: (marathonDelayMin) => {
		set({ marathonDelayMin });
		persist("marathon_delay_min", String(marathonDelayMin));
	},
	setMarathonDelayMax: (marathonDelayMax) => {
		set({ marathonDelayMax });
		persist("marathon_delay_max", String(marathonDelayMax));
	},
	setMarathonMode: (marathonMode) => {
		set({ marathonMode });
		persist("marathon_mode", marathonMode);
	},
	setMarathonQuality: (marathonQuality) => {
		set({ marathonQuality });
		persist("marathon_quality", marathonQuality);
	},
	setCloseToTray: (closeToTray) => {
		set({ closeToTray });
		persist("close_to_tray", String(closeToTray));
	},
	setAutostart: async (autostart) => {
		try {
			await invoke("toggle_autostart", { enabled: autostart });
			set({ autostart });
		} catch {
			/* revert on error */
		}
	},
	setSystemNotifications: (systemNotifications) => {
		set({ systemNotifications });
		persist("system_notifications", String(systemNotifications));
	},
	setHotkey: (action, combo) => {
		const hotkeys = { ...get().hotkeys, [action]: combo };
		set({ hotkeys });
		persist("hotkeys", JSON.stringify(hotkeys));
	},
	resetHotkeys: () => {
		const hotkeys = { ...DEFAULT_HOTKEYS };
		set({ hotkeys });
		persist("hotkeys", JSON.stringify(hotkeys));
	},

	loadFromDb: async () => {
		try {
			const s = await invoke<Record<string, string>>("get_all_settings");
			const patch: Partial<SettingsState> = {};

			if (s.language === "en" || s.language === "ru") patch.language = s.language as Lang;
			if (s.default_quality) patch.defaultQuality = s.default_quality;
			if (s.auto_next_episode !== undefined) patch.autoNextEpisode = s.auto_next_episode !== "false";
			if (s.next_ep_countdown) patch.nextEpCountdown = Number(s.next_ep_countdown) || 5;
			if (s.skip_mode) patch.skipMode = s.skip_mode as SkipMode;
			if (s.skip_button_timeout) patch.skipButtonTimeout = Number(s.skip_button_timeout) || 7;
			if (s.sidebar_collapsed) patch.sidebarCollapsed = s.sidebar_collapsed === "true";
			if (s.close_to_tray) patch.closeToTray = s.close_to_tray === "true";
			if (s.system_notifications !== undefined) patch.systemNotifications = s.system_notifications !== "false";
			if (s.marathon_delay_min) patch.marathonDelayMin = Number(s.marathon_delay_min) || 10;
			if (s.marathon_delay_max) patch.marathonDelayMax = Number(s.marathon_delay_max) || 30;
			if (s.marathon_mode) patch.marathonMode = s.marathon_mode as MarathonMode;
			if (s.marathon_quality) patch.marathonQuality = s.marathon_quality;
			if (s.hotkeys) {
				try {
					patch.hotkeys = { ...DEFAULT_HOTKEYS, ...JSON.parse(s.hotkeys) };
				} catch { /* keep defaults */ }
			}

			set(patch);
		} catch {
			/* keep defaults */
		}

		// Autostart from plugin (ground truth)
		try {
			const autostart = await invoke<boolean>("is_autostart_enabled");
			set({ autostart });
		} catch {
			/* ignore */
		}
	},
}));