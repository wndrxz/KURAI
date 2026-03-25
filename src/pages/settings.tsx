import { useState, useEffect, useCallback } from "react";
import { Settings as SettingsIcon, RotateCcw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router";
import { useAuthStore } from "../stores/auth";
import {
	useSettingsStore,
	DEFAULT_HOTKEYS,
	type SkipMode,
	type MarathonMode,
} from "../stores/settings";
import { useTranslation } from "../lib/i18n";
import { formatHotkey } from "../hooks/use-keyboard";
import { showToast } from "../components/toast";

// ── Inline UI primitives ────────────────

function Toggle({
	checked,
	onChange,
}: { checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<button
			type="button"
			onClick={() => onChange(!checked)}
			className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
				checked ? "bg-white" : "bg-[#333]"
			}`}
		>
			<div
				className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
					checked
						? "translate-x-[18px] bg-black"
						: "translate-x-0.5 bg-[#666]"
				}`}
			/>
		</button>
	);
}

function Select({
	value,
	options,
	onChange,
}: {
	value: string;
	options: { value: string; label: string }[];
	onChange: (v: string) => void;
}) {
	return (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value)}
			className="rounded-md border border-border bg-bg-card px-3 py-1.5 text-sm text-text-primary outline-none focus:border-[#333]"
		>
			{options.map((o) => (
				<option key={o.value} value={o.value}>
					{o.label}
				</option>
			))}
		</select>
	);
}

function NumberInput({
	value,
	min,
	max,
	onChange,
}: {
	value: number;
	min: number;
	max: number;
	onChange: (v: number) => void;
}) {
	return (
		<input
			type="number"
			value={value}
			min={min}
			max={max}
			onChange={(e) => onChange(Number(e.target.value) || min)}
			className="w-20 rounded-md border border-border bg-bg-card px-3 py-1.5 text-center text-sm text-text-primary outline-none focus:border-[#333]"
		/>
	);
}

function Row({
	label,
	children,
}: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-4 py-2">
			<span className="text-sm text-text-secondary">{label}</span>
			{children}
		</div>
	);
}

function Section({
	title,
	children,
}: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-xl border border-border bg-bg-card p-5">
			<h3 className="mb-4 text-base font-semibold text-text-primary">
				{title}
			</h3>
			<div className="flex flex-col divide-y divide-border-subtle">
				{children}
			</div>
		</div>
	);
}

// ── Hotkey recorder ────────────────

function HotkeyButton({
	value,
	onChange,
	pressLabel,
}: {
	value: string;
	onChange: (combo: string) => void;
	pressLabel: string;
}) {
	const [recording, setRecording] = useState(false);

	useEffect(() => {
		if (!recording) return;
		const handler = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (e.key === "Escape") {
				setRecording(false);
				return;
			}
			const parts: string[] = [];
			if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
			if (e.shiftKey) parts.push("Shift");
			if (e.altKey) parts.push("Alt");
			if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
				parts.push(e.key);
			}
			const last = parts[parts.length - 1];
			if (
				parts.length > 0 &&
				!["Control", "Shift", "Alt", "Meta"].includes(last ?? "")
			) {
				onChange(parts.join("+"));
				setRecording(false);
			}
		};
		window.addEventListener("keydown", handler, true);
		return () => window.removeEventListener("keydown", handler, true);
	}, [recording, onChange]);

	return (
		<button
			type="button"
			onClick={() => setRecording(true)}
			className={`rounded-md border px-3 py-1 font-mono text-xs transition-default ${
				recording
					? "animate-pulse border-white bg-white/10 text-white"
					: "border-border bg-bg-elevated text-text-secondary hover:border-[#333] hover:text-text-primary"
			}`}
		>
			{recording ? pressLabel : formatHotkey(value)}
		</button>
	);
}

// ── Hotkey action list ────────────────

const HOTKEY_ACTIONS = [
	"player.playPause",
	"player.seekBack",
	"player.seekForward",
	"player.seekBackLong",
	"player.seekForwardLong",
	"player.volumeUp",
	"player.volumeDown",
	"player.mute",
	"player.fullscreen",
	"player.nextEp",
	"player.prevEp",
	"player.skip",
	"hotkey.search",
	"hotkey.settings",
] as const;

// Map action → i18n key for the label
const HOTKEY_I18N: Record<string, string> = {
	"player.playPause": "hotkey.playPause",
	"player.seekBack": "hotkey.seekBack",
	"player.seekForward": "hotkey.seekForward",
	"player.seekBackLong": "hotkey.seekBackLong",
	"player.seekForwardLong": "hotkey.seekForwardLong",
	"player.volumeUp": "hotkey.volumeUp",
	"player.volumeDown": "hotkey.volumeDown",
	"player.mute": "hotkey.mute",
	"player.fullscreen": "hotkey.fullscreen",
	"player.nextEp": "hotkey.nextEp",
	"player.prevEp": "hotkey.prevEp",
	"player.skip": "hotkey.skip",
	"hotkey.search": "hotkey.search",
	"hotkey.settings": "hotkey.settings",
};

// ── Page ─────────────────────────

export default function SettingsPage() {
	const { t } = useTranslation();
	const { user, logout } = useAuthStore();
	const navigate = useNavigate();
	const settings = useSettingsStore();
	const [updateMsg, setUpdateMsg] = useState("");

	const handleLogout = async () => {
		await logout();
		navigate("/login", { replace: true });
	};

	const handleCheckUpdates = async () => {
		try {
			const result = await invoke<string>("check_for_updates");
			setUpdateMsg(
				result === "no_updates" ? t("settings.noUpdates") : result,
			);
			setTimeout(() => setUpdateMsg(""), 4000);
		} catch (e) {
			showToast(String(e), "error");
		}
	};

	const handleSetHotkey = useCallback(
		(action: string, combo: string) => {
			settings.setHotkey(action, combo);
		},
		[settings.setHotkey],
	);

	return (
		<div className="flex flex-col gap-6 overflow-y-auto pb-8 pr-2">
			{/* Header */}
			<div className="flex items-center gap-3">
				<SettingsIcon size={24} className="text-text-primary" />
				<h1 className="text-2xl font-bold text-text-primary">
					{t("settings.title")}
				</h1>
			</div>

			{/* Account */}
			<Section title={t("settings.account")}>
				{user && (
					<>
						<Row label={t("settings.nickname")}>
							<span className="text-sm text-text-primary">
								{user.nickname}
							</span>
						</Row>
						<Row label={t("settings.region")}>
							<span className="text-sm text-text-primary">
								{user.region}
							</span>
						</Row>
						<Row label={t("settings.watched")}>
							<span className="font-mono text-sm text-text-primary">
								{user.watchCount}
							</span>
						</Row>
						<Row label={t("settings.subscription")}>
							<span className="text-sm text-text-primary">
								{user.subscribed
									? t("settings.subscriptionActive")
									: t("settings.subscriptionNone")}
							</span>
						</Row>
						<div className="pt-3">
							<button
								type="button"
								onClick={handleLogout}
								className="rounded-lg border border-error/30 px-4 py-2 text-sm text-error transition-default hover:bg-error/10"
							>
								{t("auth.logout")}
							</button>
						</div>
					</>
				)}
			</Section>

			{/* Player */}
			<Section title={t("settings.player")}>
				<Row label={t("settings.defaultQuality")}>
					<Select
						value={settings.defaultQuality}
						onChange={settings.setDefaultQuality}
						options={[
							{ value: "FULL_HD", label: "1080p" },
							{ value: "QHD", label: "1440p" },
							{ value: "ULTRA_HD", label: "4K" },
						]}
					/>
				</Row>
				<Row label={t("settings.autoNext")}>
					<Toggle
						checked={settings.autoNextEpisode}
						onChange={settings.setAutoNextEpisode}
					/>
				</Row>
				<Row label={t("settings.nextCountdown")}>
					<div className="flex items-center gap-2">
						<NumberInput
							value={settings.nextEpCountdown}
							min={1}
							max={15}
							onChange={settings.setNextEpCountdown}
						/>
						<span className="text-xs text-text-muted">
							{t("common.sec")}
						</span>
					</div>
				</Row>
				<Row label={t("settings.skipMode")}>
					<Select
						value={settings.skipMode}
						onChange={(v) => settings.setSkipMode(v as SkipMode)}
						options={[
							{
								value: "auto",
								label: t("settings.skipModeAuto"),
							},
							{
								value: "button",
								label: t("settings.skipModeButton"),
							},
							{
								value: "off",
								label: t("settings.skipModeOff"),
							},
						]}
					/>
				</Row>
				{settings.skipMode === "button" && (
					<Row label={t("settings.skipTimeout")}>
						<div className="flex items-center gap-2">
							<NumberInput
								value={settings.skipButtonTimeout}
								min={3}
								max={15}
								onChange={settings.setSkipButtonTimeout}
							/>
							<span className="text-xs text-text-muted">
								{t("common.sec")}
							</span>
						</div>
					</Row>
				)}
			</Section>

			{/* Marathon */}
			<Section title={t("settings.marathonSection")}>
				<Row label={t("settings.marathonDelayMin")}>
					<div className="flex items-center gap-2">
						<NumberInput
							value={settings.marathonDelayMin}
							min={5}
							max={120}
							onChange={settings.setMarathonDelayMin}
						/>
						<span className="text-xs text-text-muted">
							{t("common.sec")}
						</span>
					</div>
				</Row>
				<Row label={t("settings.marathonDelayMax")}>
					<div className="flex items-center gap-2">
						<NumberInput
							value={settings.marathonDelayMax}
							min={10}
							max={300}
							onChange={settings.setMarathonDelayMax}
						/>
						<span className="text-xs text-text-muted">
							{t("common.sec")}
						</span>
					</div>
				</Row>
				<Row label={t("settings.marathonMode")}>
					<Select
						value={settings.marathonMode}
						onChange={(v) =>
							settings.setMarathonMode(v as MarathonMode)
						}
						options={[
							{
								value: "headless",
								label: t("settings.marathonModeHeadless"),
							},
							{
								value: "video",
								label: t("settings.marathonModeVideo"),
							},
						]}
					/>
				</Row>
				<Row label={t("settings.marathonQuality")}>
					<Select
						value={settings.marathonQuality}
						onChange={settings.setMarathonQuality}
						options={[
							{ value: "FULL_HD", label: "1080p" },
							{ value: "QHD", label: "1440p" },
							{ value: "ULTRA_HD", label: "4K" },
						]}
					/>
				</Row>
			</Section>

			{/* Hotkeys */}
			<Section title={t("settings.hotkeys")}>
				{HOTKEY_ACTIONS.map((action) => (
					<Row
						key={action}
						label={t(HOTKEY_I18N[action] ?? action)}
					>
						<HotkeyButton
							value={
								settings.hotkeys[action] ??
								DEFAULT_HOTKEYS[action] ??
								""
							}
							onChange={(combo) =>
								handleSetHotkey(action, combo)
							}
							pressLabel={t("settings.pressKey")}
						/>
					</Row>
				))}
				<div className="pt-3">
					<button
						type="button"
						onClick={settings.resetHotkeys}
						className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-default hover:border-[#333] hover:text-text-primary"
					>
						<RotateCcw size={12} />
						{t("settings.resetHotkeys")}
					</button>
				</div>
			</Section>

			{/* Application */}
			<Section title={t("settings.app")}>
				<Row label={t("settings.language")}>
					<Select
						value={settings.language}
						onChange={(v) =>
							settings.setLanguage(v as "ru" | "en")
						}
						options={[
							{ value: "ru", label: "Русский" },
							{ value: "en", label: "English" },
						]}
					/>
				</Row>
				<Row label={t("settings.closeToTray")}>
					<Toggle
						checked={settings.closeToTray}
						onChange={settings.setCloseToTray}
					/>
				</Row>
				<Row label={t("settings.autostart")}>
					<Toggle
						checked={settings.autostart}
						onChange={settings.setAutostart}
					/>
				</Row>
				<Row label={t("settings.notifications")}>
					<Toggle
						checked={settings.systemNotifications}
						onChange={settings.setSystemNotifications}
					/>
				</Row>
			</Section>

			{/* About */}
			<Section title={t("settings.about")}>
				<Row label={t("settings.version")}>
					<span className="font-mono text-sm text-text-muted">
						0.1.0
					</span>
				</Row>
				<div className="pt-3 flex items-center gap-3">
					<button
						type="button"
						onClick={handleCheckUpdates}
						className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-default hover:border-[#333] hover:text-text-primary"
					>
						{t("settings.checkUpdates")}
					</button>
					{updateMsg && (
						<span className="text-xs text-text-muted animate-fade-in">
							{updateMsg}
						</span>
					)}
				</div>
			</Section>
		</div>
	);
}