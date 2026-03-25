import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export { invoke, listen };

export async function getSetting(key: string): Promise<string | null> {
	return invoke<string | null>("get_setting", { key });
}

export async function setSetting(key: string, value: string): Promise<void> {
	return invoke("set_setting", { key, value });
}