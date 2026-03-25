use serde::{Deserialize, Serialize};

// ═══════════════════════════════════════
// Marathon Config — все настройки движка
// ═══════════════════════════════════════

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MarathonConfig {
    pub preset: Preset,

    // ── Timing ──
    pub ep_duration_min: u64,       // сек, мин длительность "просмотра"
    pub ep_duration_max: u64,       // сек, макс
    pub delay_between_min: u64,     // сек, задержка между сериями (в binge)
    pub delay_between_max: u64,

    // ── Binge sessions ──
    pub binge_min: u32,             // мин серий подряд
    pub binge_max: u32,             // макс серий подряд
    pub binge_break_min: u64,       // сек, перерыв после binge
    pub binge_break_max: u64,

    // ── AFK (имитация человека) ──
    pub afk_chance: f64,            // 0.0–1.0, шанс короткого AFK
    pub afk_min: u64,               // сек
    pub afk_max: u64,
    pub long_afk_chance: f64,       // шанс длинного AFK
    pub long_afk_min: u64,
    pub long_afk_max: u64,

    // ── Partial watch (недосмотр) ──
    pub partial_chance: f64,        // шанс не досмотреть серию
    pub partial_min: f64,           // 0.0–1.0, мин доля просмотра
    pub partial_max: f64,

    // ── Night mode ──
    pub night_mode: NightMode,
    pub night_start_hour: u32,      // 0–23
    pub night_end_hour: u32,

    // ── Auto-pick ──
    pub auto_pick: bool,
    pub auto_pick_max_episodes: u32,    // макс серий в аниме (12/26/52/9999)
    pub auto_pick_max_viral: f64,       // макс viral score
    pub dedup_days: u32,                // не повторять за N дней

    // ── Limits ──
    pub max_hours_per_day: f64,         // 0 = без лимита
    pub max_ep_retries: u32,            // retry одного эпизода перед skip
    pub backoff_base: u64,              // сек, начальный backoff при ошибках
    pub backoff_max: u64,               // сек, макс backoff

    // ── Heartbeat ──
    pub heartbeat_interval: u64,        // сек, проверка токена
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Preset {
    Ghost,
    Standard,
    Rage,
    Custom,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NightMode {
    Off,        // без изменений
    Slow,       // замедление ×2
    Sleep,      // не смотрит вообще
}

// ═══════════════════════════════════════
// Пресеты
// ═══════════════════════════════════════

impl MarathonConfig {
    pub fn ghost() -> Self {
        Self {
            preset: Preset::Ghost,
            ep_duration_min: 1350,
            ep_duration_max: 1600,
            delay_between_min: 8,
            delay_between_max: 45,
            binge_min: 2,
            binge_max: 4,
            binge_break_min: 300,
            binge_break_max: 900,
            afk_chance: 0.08,
            afk_min: 60,
            afk_max: 300,
            long_afk_chance: 0.02,
            long_afk_min: 600,
            long_afk_max: 1800,
            partial_chance: 0.10,
            partial_min: 0.82,
            partial_max: 0.96,
            night_mode: NightMode::Sleep,
            night_start_hour: 2,
            night_end_hour: 8,
            auto_pick: true,
            auto_pick_max_episodes: 12,
            auto_pick_max_viral: 30.0,
            dedup_days: 30,
            max_hours_per_day: 7.0,
            max_ep_retries: 10,
            backoff_base: 30,
            backoff_max: 600,
            heartbeat_interval: 1800,
        }
    }

    pub fn standard() -> Self {
        Self {
            preset: Preset::Standard,
            ep_duration_min: 1300,
            ep_duration_max: 1500,
            delay_between_min: 3,
            delay_between_max: 25,
            binge_min: 3,
            binge_max: 8,
            binge_break_min: 120,
            binge_break_max: 480,
            afk_chance: 0.04,
            afk_min: 30,
            afk_max: 240,
            long_afk_chance: 0.008,
            long_afk_min: 300,
            long_afk_max: 1200,
            partial_chance: 0.05,
            partial_min: 0.85,
            partial_max: 0.97,
            night_mode: NightMode::Slow,
            night_start_hour: 2,
            night_end_hour: 7,
            auto_pick: true,
            auto_pick_max_episodes: 26,
            auto_pick_max_viral: 80.0,
            dedup_days: 14,
            max_hours_per_day: 16.0,
            max_ep_retries: 10,
            backoff_base: 30,
            backoff_max: 600,
            heartbeat_interval: 1800,
        }
    }

    pub fn rage() -> Self {
        Self {
            preset: Preset::Rage,
            ep_duration_min: 1200,
            ep_duration_max: 1400,
            delay_between_min: 2,
            delay_between_max: 12,
            binge_min: 5,
            binge_max: 15,
            binge_break_min: 60,
            binge_break_max: 300,
            afk_chance: 0.02,
            afk_min: 20,
            afk_max: 90,
            long_afk_chance: 0.003,
            long_afk_min: 180,
            long_afk_max: 480,
            partial_chance: 0.03,
            partial_min: 0.88,
            partial_max: 0.98,
            night_mode: NightMode::Off,
            night_start_hour: 2,
            night_end_hour: 7,
            auto_pick: true,
            auto_pick_max_episodes: 9999,
            auto_pick_max_viral: 150.0,
            dedup_days: 7,
            max_hours_per_day: 0.0, // без лимита
            max_ep_retries: 10,
            backoff_base: 20,
            backoff_max: 300,
            heartbeat_interval: 1800,
        }
    }

    pub fn from_preset(preset: &str) -> Self {
        match preset {
            "ghost" => Self::ghost(),
            "rage" => Self::rage(),
            _ => Self::standard(),
        }
    }
}

impl Default for MarathonConfig {
    fn default() -> Self {
        Self::standard()
    }
}

// ═══════════════════════════════════════
// Gaussian-подобная рандомизация
// ═══════════════════════════════════════

use rand::Rng;
use std::time::Duration;

/// Gaussian-подобное распределение через Box–Muller (упрощённый).
/// Центр = (min+max)/2, разброс подгоняется чтобы 95% в [min,max].
pub fn rand_gaussian_duration(min_secs: u64, max_secs: u64) -> Duration {
    let mut rng = rand::thread_rng();
    let center = (min_secs + max_secs) as f64 / 2.0;
    let sigma = (max_secs - min_secs) as f64 / 4.0; // ±2σ = range

    // Box–Muller transform
    let u1: f64 = rng.gen_range(0.0001..1.0);
    let u2: f64 = rng.gen_range(0.0..std::f64::consts::TAU);
    let z = (-2.0 * u1.ln()).sqrt() * u2.cos();

    let value = center + z * sigma;
    let clamped = value.round().max(min_secs as f64).min(max_secs as f64) as u64;
    Duration::from_secs(clamped)
}

/// Равномерное случайное с jitter ±15%
pub fn rand_delay_secs(min: u64, max: u64) -> Duration {
    let mut rng = rand::thread_rng();
    let base = rng.gen_range(min..=max.max(min));
    let jitter = (base as f64 * rng.gen_range(-0.15..0.15)) as i64;
    let final_val = (base as i64 + jitter).max(1) as u64;
    Duration::from_secs(final_val)
}

/// Проверка: сейчас ночное время?
pub fn is_night_now(start_hour: u32, end_hour: u32) -> bool {
    let hour = current_hour();
    if start_hour < end_hour {
        hour >= start_hour && hour < end_hour
    } else {
        // Переход через полночь (например 22..6)
        hour >= start_hour || hour < end_hour
    }
}

fn current_hour() -> u32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // UTC+0 час. Для локального времени можно добавить offset,
    // но chrono не в зависимостях. Используем time crate или просто UTC.
    // Для простоты: UTC. Пользователь может подкрутить start/end.
    ((secs % 86400) / 3600) as u32
}

/// Случайное bool с заданной вероятностью
pub fn chance(probability: f64) -> bool {
    rand::thread_rng().gen_bool(probability.clamp(0.0, 1.0))
}

/// Новый размер binge
pub fn rand_binge_size(min: u32, max: u32) -> u32 {
    rand::thread_rng().gen_range(min..=max.max(min))
}