import { useState } from "react";
import {
	Shield,
	Gauge,
	Flame,
	Settings2,
	Moon,
	MoonStar,
	Sun,
	Shuffle,
	List,
	Play,
	Monitor,
	Loader2,
} from "lucide-react";

export interface MarathonConfigData {
	preset: string;
	epDurationMin: number;
	epDurationMax: number;
	delayBetweenMin: number;
	delayBetweenMax: number;
	bingeMin: number;
	bingeMax: number;
	bingeBreakMin: number;
	bingeBreakMax: number;
	afkChance: number;
	afkMin: number;
	afkMax: number;
	longAfkChance: number;
	longAfkMin: number;
	longAfkMax: number;
	partialChance: number;
	partialMin: number;
	partialMax: number;
	nightMode: string;
	nightStartHour: number;
	nightEndHour: number;
	autoPick: boolean;
	autoPickMaxEpisodes: number;
	autoPickMaxViral: number;
	dedupDays: number;
	maxHoursPerDay: number;
	maxEpRetries: number;
	backoffBase: number;
	backoffMax: number;
	heartbeatInterval: number;
}

const PRESETS: Record<
	string,
	{ label: string; desc: string; speed: string; risk: string; icon: typeof Shield; color: string }
> = {
	ghost: {
		label: "Призрак",
		desc: "Обычный пользователь. Максимальная безопасность.",
		speed: "15–25 серий/день",
		risk: "Минимальный",
		icon: Shield,
		color: "text-emerald-400",
	},
	standard: {
		label: "Стандарт",
		desc: "Активный зритель. Баланс скорости и безопасности.",
		speed: "35–50 серий/день",
		risk: "Низкий",
		icon: Gauge,
		color: "text-yellow-400",
	},
	rage: {
		label: "Рейдж",
		desc: "Максимальный фарм 24/7 с маскировкой.",
		speed: "60–80 серий/день",
		risk: "Средний",
		icon: Flame,
		color: "text-red-400",
	},
};

function getPresetConfig(preset: string): MarathonConfigData {
	switch (preset) {
		case "ghost":
			return {
				preset: "ghost",
				epDurationMin: 1350, epDurationMax: 1600,
				delayBetweenMin: 8, delayBetweenMax: 45,
				bingeMin: 2, bingeMax: 4,
				bingeBreakMin: 300, bingeBreakMax: 900,
				afkChance: 0.08, afkMin: 60, afkMax: 300,
				longAfkChance: 0.02, longAfkMin: 600, longAfkMax: 1800,
				partialChance: 0.10, partialMin: 0.82, partialMax: 0.96,
				nightMode: "sleep", nightStartHour: 2, nightEndHour: 8,
				autoPick: true, autoPickMaxEpisodes: 12, autoPickMaxViral: 30,
				dedupDays: 30, maxHoursPerDay: 7,
				maxEpRetries: 10, backoffBase: 30, backoffMax: 600,
				heartbeatInterval: 1800,
			};
		case "rage":
			return {
				preset: "rage",
				epDurationMin: 1200, epDurationMax: 1400,
				delayBetweenMin: 2, delayBetweenMax: 12,
				bingeMin: 5, bingeMax: 15,
				bingeBreakMin: 60, bingeBreakMax: 300,
				afkChance: 0.02, afkMin: 20, afkMax: 90,
				longAfkChance: 0.003, longAfkMin: 180, longAfkMax: 480,
				partialChance: 0.03, partialMin: 0.88, partialMax: 0.98,
				nightMode: "off", nightStartHour: 2, nightEndHour: 7,
				autoPick: true, autoPickMaxEpisodes: 9999, autoPickMaxViral: 150,
				dedupDays: 7, maxHoursPerDay: 0,
				maxEpRetries: 10, backoffBase: 20, backoffMax: 300,
				heartbeatInterval: 1800,
			};
		default:
			return {
				preset: "standard",
				epDurationMin: 1300, epDurationMax: 1500,
				delayBetweenMin: 3, delayBetweenMax: 25,
				bingeMin: 3, bingeMax: 8,
				bingeBreakMin: 120, bingeBreakMax: 480,
				afkChance: 0.04, afkMin: 30, afkMax: 240,
				longAfkChance: 0.008, longAfkMin: 300, longAfkMax: 1200,
				partialChance: 0.05, partialMin: 0.85, partialMax: 0.97,
				nightMode: "slow", nightStartHour: 2, nightEndHour: 7,
				autoPick: true, autoPickMaxEpisodes: 26, autoPickMaxViral: 80,
				dedupDays: 14, maxHoursPerDay: 16,
				maxEpRetries: 10, backoffBase: 30, backoffMax: 600,
				heartbeatInterval: 1800,
			};
	}
}

interface Props {
	isRunning: boolean;
	isStarting: boolean;
	onStart: (config: MarathonConfigData, headless: boolean) => void;
}

export function MarathonConfigPanel({ isRunning, isStarting, onStart }: Props) {
	const [selected, setSelected] = useState("standard");
	const [showCustom, setShowCustom] = useState(false);
	const [config, setConfig] = useState<MarathonConfigData>(getPresetConfig("standard"));

	const selectPreset = (key: string) => {
		setSelected(key);
		setShowCustom(false);
		setConfig(getPresetConfig(key));
	};

	const openCustom = () => {
		setSelected("custom");
		setShowCustom(true);
		// Keep current config values for editing
	};

	const updateConfig = (patch: Partial<MarathonConfigData>) => {
		setConfig((prev) => ({ ...prev, ...patch, preset: "custom" }));
	};

	if (isRunning) return null;

	return (
		<div className="rounded-xl border border-border bg-bg-card p-5 space-y-5">
			{/* Preset cards */}
			<div>
				<h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
					Режим
				</h3>
				<div className="grid grid-cols-3 gap-2">
					{Object.entries(PRESETS).map(([key, p]) => {
						const Icon = p.icon;
						const active = selected === key;
						return (
							<button
								key={key}
								type="button"
								onClick={() => selectPreset(key)}
								className={`rounded-lg border p-3 text-left transition-all ${
									active
										? "border-white/30 bg-bg-hover"
										: "border-border bg-bg-root hover:border-border hover:bg-bg-hover/50"
								}`}
							>
								<Icon className={`h-5 w-5 mb-2 ${p.color}`} />
								<div className="text-sm font-medium text-text-primary">{p.label}</div>
								<div className="text-[11px] text-text-muted mt-0.5">{p.speed}</div>
								<div className="text-[11px] text-text-muted">Риск: {p.risk}</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Custom toggle */}
			<button
				type="button"
				onClick={openCustom}
				className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
					selected === "custom"
						? "border-white/30 bg-bg-hover text-text-primary"
						: "border-border text-text-secondary hover:text-text-primary"
				}`}
			>
				<Settings2 className="h-3.5 w-3.5" />
				Настроить вручную
			</button>

			{/* Custom panel */}
			{showCustom && (
				<div className="space-y-4 rounded-lg border border-border bg-bg-root p-4">
					<ConfigRow label="Аниме: макс. серий" value={config.autoPickMaxEpisodes}
						onChange={(v) => updateConfig({ autoPickMaxEpisodes: v })} min={6} max={9999} />
					<ConfigRow label="Макс. популярность (viral)" value={config.autoPickMaxViral}
						onChange={(v) => updateConfig({ autoPickMaxViral: v })} min={5} max={500} />
					<ConfigRow label="Дедупликация (дней)" value={config.dedupDays}
						onChange={(v) => updateConfig({ dedupDays: v })} min={1} max={90} />
					<ConfigRow label="Часов в день (0=∞)" value={config.maxHoursPerDay}
						onChange={(v) => updateConfig({ maxHoursPerDay: v })} min={0} max={24} />
					<ConfigRow label="Binge: серий подряд (мин)" value={config.bingeMin}
						onChange={(v) => updateConfig({ bingeMin: v })} min={1} max={20} />
					<ConfigRow label="Binge: серий подряд (макс)" value={config.bingeMax}
						onChange={(v) => updateConfig({ bingeMax: v })} min={config.bingeMin} max={30} />
					<ConfigRow label="Перерыв binge (мин, сек)" value={config.bingeBreakMin}
						onChange={(v) => updateConfig({ bingeBreakMin: v })} min={10} max={1800} />
					<ConfigRow label="Перерыв binge (макс, сек)" value={config.bingeBreakMax}
						onChange={(v) => updateConfig({ bingeBreakMax: v })} min={config.bingeBreakMin} max={3600} />
					<ConfigRow label="Длительность эп. (мин, сек)" value={config.epDurationMin}
						onChange={(v) => updateConfig({ epDurationMin: v })} min={600} max={2000} />
					<ConfigRow label="Длительность эп. (макс, сек)" value={config.epDurationMax}
						onChange={(v) => updateConfig({ epDurationMax: v })} min={config.epDurationMin} max={2400} />

					{/* Night mode */}
					<div className="flex items-center justify-between">
						<span className="text-xs text-text-secondary">Ночной режим</span>
						<div className="flex gap-1">
							{(["off", "slow", "sleep"] as const).map((mode) => {
								const icons = { off: Sun, slow: Moon, sleep: MoonStar };
								const labels = { off: "Выкл", slow: "Медл.", sleep: "Спать" };
								const Icon = icons[mode];
								return (
									<button
										key={mode}
										type="button"
										onClick={() => updateConfig({ nightMode: mode })}
										className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-all ${
											config.nightMode === mode
												? "bg-bg-hover text-text-primary"
												: "text-text-muted hover:text-text-secondary"
										}`}
									>
										<Icon className="h-3 w-3" />
										{labels[mode]}
									</button>
								);
							})}
						</div>
					</div>

					{/* Auto-pick toggle */}
					<div className="flex items-center justify-between">
						<span className="text-xs text-text-secondary">Авто-подбор аниме</span>
						<button
							type="button"
							onClick={() => updateConfig({ autoPick: !config.autoPick })}
							className={`rounded px-3 py-1 text-[11px] font-medium transition-all ${
								config.autoPick
									? "bg-emerald-500/20 text-emerald-400"
									: "bg-bg-hover text-text-muted"
							}`}
						>
							{config.autoPick ? "Вкл" : "Выкл"}
						</button>
					</div>
				</div>
			)}

			{/* Source selection */}
			<div className="flex items-center gap-3">
				<span className="text-xs text-text-secondary">Аниме:</span>
				<button
					type="button"
					onClick={() => updateConfig({ autoPick: true })}
					className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all ${
						config.autoPick
							? "bg-white text-black"
							: "border border-border text-text-secondary hover:text-text-primary"
					}`}
				>
					<Shuffle className="h-3 w-3" />
					Авто-подбор
				</button>
				<button
					type="button"
					onClick={() => updateConfig({ autoPick: false })}
					className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all ${
						!config.autoPick
							? "bg-white text-black"
							: "border border-border text-text-secondary hover:text-text-primary"
					}`}
				>
					<List className="h-3 w-3" />
					Только очередь
				</button>
			</div>

			{/* Start buttons */}
			<div className="flex gap-2 pt-1">
				<button
					type="button"
					disabled={isStarting}
					onClick={() => onStart(config, true)}
					className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#ccc] disabled:opacity-50"
				>
					{isStarting ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Play className="h-4 w-4" />
					)}
					Запустить в фоне
				</button>
				<button
					type="button"
					disabled={isStarting}
					onClick={() => onStart(config, false)}
					className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary disabled:opacity-50"
				>
					<Monitor className="h-4 w-4" />
					С видео
				</button>
			</div>
		</div>
	);
}

// ═══════════════════════════════════════
// Config Row (number input)
// ═══════════════════════════════════════

function ConfigRow({
	label, value, onChange, min, max,
}: {
	label: string; value: number; onChange: (v: number) => void; min: number; max: number;
}) {
	return (
		<div className="flex items-center justify-between">
			<span className="text-xs text-text-secondary">{label}</span>
			<input
				type="number"
				min={min}
				max={max}
				value={value}
				onChange={(e) => {
					const v = Number(e.target.value);
					if (!Number.isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
				}}
				className="w-20 rounded-md border border-border bg-bg-card px-2 py-1 text-center text-xs text-text-primary outline-none focus:border-[#333]"
			/>
		</div>
	);
}