export const QUALITIES = {
	FULL_HD: "1080p",
	QHD: "1440p",
	ULTRA_HD: "4K",
} as const;

export const DEFAULT_QUALITY = "FULL_HD";
export const SKIP_BUTTON_TIMEOUT = 7000;
export const NEXT_EP_COUNTDOWN = 5;
export const NEXT_EP_TRIGGER = 30;
export const SEARCH_DEBOUNCE = 300;
export const PROGRESS_SAVE_INTERVAL = 30_000;
export const CONTROLS_HIDE_DELAY = 3000;
export const SEEK_STEP = 5;
export const SEEK_STEP_LARGE = 30;
export const VOLUME_STEP = 0.05;