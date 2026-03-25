import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface UserInfo {
	id: number;
	nickname: string;
	region: string;
	watchCount: number;
	subscribed: boolean;
	profilePic: string;
}

interface AuthState {
	user: UserInfo | null;
	isLoading: boolean;
	login: (
		username: string,
		password: string,
		remember?: boolean,
	) => Promise<void>;
	logout: () => Promise<void>;
	checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	isLoading: true,

	login: async (username, password, remember = true) => {
		const user = await invoke<UserInfo>("login", {
			login: username,
			password,
			remember,
		});
		set({ user, isLoading: false });
	},

	logout: async () => {
		await invoke("logout");
		set({ user: null });
	},

	checkAuth: async () => {
		try {
			const user = await invoke<UserInfo | null>("get_current_user");
			set({ user, isLoading: false });
		} catch {
			set({ user: null, isLoading: false });
		}
	},
}));