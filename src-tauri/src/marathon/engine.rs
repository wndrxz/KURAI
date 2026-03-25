use std::sync::Arc;
use std::time::{Duration, Instant};

use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::sync::{mpsc, Mutex as TokioMutex, RwLock};

use crate::animix::client::AnimixClient;
use crate::animix::types::*;

use super::config::*;
use super::navigator::Navigator;
use super::queue;

// ═══════════════════════════════════════
// Event types (Rust → Frontend via emit)
// ═══════════════════════════════════════

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct EpisodeDoneEvent {
    anime_title: String,
    episode: u32,
    season: u32,
}

#[derive(Serialize, Clone)]
struct MarathonErrorEvent {
    message: String,
    will_retry: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct MarathonCompleteEvent {
    total_episodes: u32,
    total_time_sec: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PlayEpisodeEvent {
    anime_id: u64,
    anime_title: String,
    season: u32,
    episode: u32,
    series_id: u64,
    private_id: String,
}

// ═══════════════════════════════════════
// Signals
// ═══════════════════════════════════════

pub enum MarathonSignal {
    Stop,
    Pause,
    Resume,
    Skip,
    EpisodeDone(u64),
}

enum SleepOutcome {
    Completed,
    Stop,
    Skip,
}

enum EpResult {
    Done(u64),
    Stop,
    SkipAnime,
    Error(String),
}

// ═══════════════════════════════════════
// Marathon State
// ═══════════════════════════════════════

pub struct MarathonState {
    pub status: Arc<RwLock<MarathonStatus>>,
    pub signal_tx: Arc<TokioMutex<Option<mpsc::Sender<MarathonSignal>>>>,
    pub config: Arc<RwLock<Option<MarathonConfig>>>,
}

impl MarathonState {
    pub fn new() -> Self {
        Self {
            status: Arc::new(RwLock::new(MarathonStatus {
                active: false,
                paused: false,
                infinite: false,
                on_break: false,
                break_ends_at: None,
                current_anime: None,
                current_episode: None,
                current_season: None,
                total_farmed: 0,
                session_started_at: None,
                queue_remaining: 0,
                episodes_per_hour: 0.0,
            })),
            signal_tx: Arc::new(TokioMutex::new(None)),
            config: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn is_running(&self) -> bool {
        self.signal_tx.lock().await.is_some()
    }

    pub async fn send(&self, signal: MarathonSignal) -> Result<(), String> {
        let guard = self.signal_tx.lock().await;
        match &*guard {
            Some(tx) => tx.send(signal).await.map_err(|_| "Engine not running".into()),
            None => Err("Marathon not running".into()),
        }
    }

    pub async fn get_status(&self) -> MarathonStatus {
        self.status.read().await.clone()
    }

    pub async fn get_config(&self) -> Option<MarathonConfig> {
        self.config.read().await.clone()
    }
}

// ═══════════════════════════════════════
// Start
// ═══════════════════════════════════════

pub async fn start(
    status: Arc<RwLock<MarathonStatus>>,
    signal_holder: Arc<TokioMutex<Option<mpsc::Sender<MarathonSignal>>>>,
    config_holder: Arc<RwLock<Option<MarathonConfig>>>,
    client: Arc<AnimixClient>,
    app: AppHandle,
    config: MarathonConfig,
    headless: bool,
) -> Result<(), String> {
    if signal_holder.lock().await.is_some() {
        return Err("Marathon already running".into());
    }

    let (tx, rx) = mpsc::channel::<MarathonSignal>(32);
    *signal_holder.lock().await = Some(tx);
    *config_holder.write().await = Some(config.clone());

    let status_cleanup = status.clone();
    let signal_cleanup = signal_holder.clone();
    let config_cleanup = config_holder.clone();
    let app_cleanup = app.clone();

    tokio::spawn(async move {
        run_loop(rx, status, client, app, config, headless).await;

        // Cleanup
        {
            let mut s = status_cleanup.write().await;
            s.active = false;
            s.paused = false;
            s.infinite = false;
            s.on_break = false;
            s.break_ends_at = None;
            s.current_anime = None;
            s.current_episode = None;
            s.current_season = None;
            let _ = app_cleanup.emit("marathon:status", s.clone());
        }
        *signal_cleanup.lock().await = None;
        *config_cleanup.write().await = None;
    });

    Ok(())
}

// ═══════════════════════════════════════
// Macro for save-and-break pattern
// ═══════════════════════════════════════

macro_rules! save_and_break {
    ($db:expr, $item:expr, $ep:expr, $season:expr, $farmed:expr, $label:lifetime) => {{
        let conn = $db.lock().await;
        let _ = queue::update_progress(&conn, $item.id, $ep, $season, $farmed);
        break $label;
    }};
}

// ═══════════════════════════════════════
// Main Loop
// ═══════════════════════════════════════

async fn run_loop(
    mut rx: mpsc::Receiver<MarathonSignal>,
    status: Arc<RwLock<MarathonStatus>>,
    client: Arc<AnimixClient>,
    app: AppHandle,
    config: MarathonConfig,
    headless: bool,
) {
    let db = match crate::db::open() {
        Ok(c) => Arc::new(TokioMutex::new(c)),
        Err(e) => {
            emit_error(&app, &format!("Database error: {}", e), false);
            return;
        }
    };

    let session_id = {
        let conn = db.lock().await;
        match queue::create_session(&conn) {
            Ok(id) => id,
            Err(e) => {
                emit_error(&app, &format!("Session error: {}", e), false);
                return;
            }
        }
    };

    // Reset stuck items from previous crash
    {
        let conn = db.lock().await;
        let _ = queue::reset_stale_active(&conn);
    }

    let mut rng = StdRng::from_entropy();

    let session_start = now_secs();
    let mut total_farmed: u32 = 0;
    let mut total_seconds: u64 = 0;
    let mut binge_remaining = rand_binge_size(&mut rng, config.binge_min, config.binge_max);
    let mut daily_episodes: u32 = 0;
    let mut current_day = day_of_year();
    let mut last_heartbeat = Instant::now();
    let mut global_backoff: u32 = 0;

    // Initial status
    {
        let remaining = {
            let conn = db.lock().await;
            queue::count_remaining(&conn).unwrap_or(0)
        };
        let mut s = status.write().await;
        s.active = true;
        s.paused = false;
        s.infinite = config.auto_pick;
        s.on_break = false;
        s.break_ends_at = None;
        s.total_farmed = 0;
        s.session_started_at = Some(session_start);
        s.queue_remaining = remaining;
        s.episodes_per_hour = 0.0;
        let _ = app.emit("marathon:status", s.clone());
    }

    'main: loop {
        // ── Day rollover ──
        let today = day_of_year();
        if today != current_day {
            daily_episodes = 0;
            current_day = today;
        }

        // ── Daily hour limit ──
        if config.max_hours_per_day > 0.0 {
            let avg_ep = (config.ep_duration_min + config.ep_duration_max) / 2;
            let daily_secs = daily_episodes as u64 * avg_ep;
            let max_secs = (config.max_hours_per_day * 3600.0) as u64;
            if daily_secs >= max_secs {
                emit_error(&app, "Daily limit reached, waiting for next day", false);
                match wait_until(&mut rx, &status, &app, || day_of_year() != current_day).await {
                    SleepOutcome::Completed => {
                        daily_episodes = 0;
                        current_day = day_of_year();
                        continue 'main;
                    }
                    SleepOutcome::Stop => break 'main,
                    SleepOutcome::Skip => continue 'main,
                }
            }
        }

        // ── Night mode: Sleep ──
        if config.night_mode == NightMode::Sleep
            && is_night_now(config.night_start_hour, config.night_end_hour)
        {
            match wait_until(&mut rx, &status, &app, || {
                !is_night_now(config.night_start_hour, config.night_end_hour)
            })
            .await
            {
                SleepOutcome::Completed => continue 'main,
                SleepOutcome::Stop => break 'main,
                SleepOutcome::Skip => continue 'main,
            }
        }

        // ── Heartbeat ──
        if last_heartbeat.elapsed().as_secs() >= config.heartbeat_interval {
            match client.get_self().await {
                Ok(_) => {}
                Err(e) if e.contains("code 6") => {
                    emit_error(&app, "Token expired, stopping marathon", false);
                    break 'main;
                }
                Err(_) => {}
            }
            last_heartbeat = Instant::now();
        }

        // ── Get next queue item ──
        let item = {
            let conn = db.lock().await;
            queue::get_next_pending(&conn)
        };
        let item = match item {
            Ok(Some(item)) => item,
            Ok(None) => {
                if config.auto_pick {
                    match auto_pick_anime(&client, &db, &config, &mut rng).await {
                        Ok(added) if added > 0 => continue 'main,
                        Ok(_) => {
                            emit_error(&app, "Auto-pick: no suitable anime, waiting...", false);
                            match sleep_interruptible(
                                &mut rx,
                                Duration::from_secs(1800),
                                &status,
                                &app,
                            )
                            .await
                            {
                                SleepOutcome::Completed => continue 'main,
                                SleepOutcome::Stop => break 'main,
                                SleepOutcome::Skip => continue 'main,
                            }
                        }
                        Err(e) => {
                            emit_error(&app, &format!("Auto-pick error: {}", e), true);
                            let backoff =
                                backoff_duration(&mut rng, global_backoff, config.backoff_base, config.backoff_max);
                            global_backoff += 1;
                            match sleep_interruptible(&mut rx, backoff, &status, &app).await {
                                SleepOutcome::Completed => continue 'main,
                                SleepOutcome::Stop => break 'main,
                                SleepOutcome::Skip => continue 'main,
                            }
                        }
                    }
                } else {
                    break 'main;
                }
            }
            Err(e) => {
                emit_error(&app, &format!("Queue error: {}", e), false);
                break 'main;
            }
        };

        {
            let conn = db.lock().await;
            let _ = queue::mark_active(&conn, item.id);
        }

        // ── Fetch series ──
        let seasons = match client.get_series(item.anime_id).await {
            Ok(s) => {
                global_backoff = 0;
                s
            }
            Err(e) => {
                let msg = format!("{}: getSeries failed: {}", item.anime_title, e);
                {
                    let conn = db.lock().await;
                    let _ = queue::mark_error(&conn, item.id, &msg);
                }
                emit_error(&app, &msg, true);
                global_backoff += 1;
                let backoff =
                    backoff_duration(&mut rng, global_backoff, config.backoff_base, config.backoff_max);
                match sleep_interruptible(&mut rx, backoff, &status, &app).await {
                    SleepOutcome::Stop => break 'main,
                    _ => continue 'main,
                }
            }
        };

        let nav = Navigator::from_series(seasons);
        if nav.is_empty() {
            let conn = db.lock().await;
            let _ = queue::mark_error(&conn, item.id, "No available episodes");
            continue 'main;
        }

        // ── Resolve starting position ──
        let mut cur_season = item.current_season;
        let mut cur_ep = item.current_ep;
        let mut farmed = item.farmed_count;

        if farmed == 0 {
            if let Some(entry) = nav.at(item.start_ep as usize) {
                cur_season = entry.season;
                cur_ep = entry.episode;
            } else if let Some(entry) = nav.at(1) {
                cur_season = entry.season;
                cur_ep = entry.episode;
            }
        }

        let target_farmed =
            item.end_ep.unwrap_or(item.total_episodes).saturating_sub(item.start_ep) + 1;

        // ── Update status ──
        {
            let remaining = {
                let conn = db.lock().await;
                queue::count_remaining(&conn).unwrap_or(0)
            };
            let mut s = status.write().await;
            s.current_anime = Some(item.anime_title.clone());
            s.current_season = Some(cur_season);
            s.current_episode = Some(cur_ep);
            s.queue_remaining = remaining;
            let _ = app.emit("marathon:status", s.clone());
        }

        let mut ep_retries: u32 = 0;

        // ════════════ EPISODE LOOP ════════════
        'episodes: loop {
            if farmed >= target_farmed {
                let conn = db.lock().await;
                let _ = queue::mark_done(&conn, item.id);
                let _ = queue::record_farmed(&conn, item.anime_id, farmed);
                break 'episodes;
            }

            // Night slowdown check
            if config.night_mode == NightMode::Slow
                && is_night_now(config.night_start_hour, config.night_end_hour)
            {
                let extra = rand_delay_secs(&mut rng, 30, 120);
                match sleep_interruptible(&mut rx, extra, &status, &app).await {
                    SleepOutcome::Stop => {
                        save_and_break!(db, item, cur_ep, cur_season, farmed, 'main);
                    }
                    SleepOutcome::Skip => {
                        save_and_break!(db, item, cur_ep, cur_season, farmed, 'episodes);
                    }
                    SleepOutcome::Completed => {}
                }
            }

            let entry = match nav.find(cur_season, cur_ep) {
                Some((_, e)) => e.clone(),
                None => {
                    match nav.next_after(cur_season, cur_ep) {
                        Some(next) => {
                            cur_season = next.season;
                            cur_ep = next.episode;
                            continue 'episodes;
                        }
                        None => {
                            let conn = db.lock().await;
                            let _ = queue::mark_done(&conn, item.id);
                            let _ = queue::record_farmed(&conn, item.anime_id, farmed);
                            break 'episodes;
                        }
                    }
                }
            };

            // ── Process episode ──
            let result = if headless {
                process_headless(&mut rx, &client, &status, &app, entry.series.id, &config, &mut rng).await
            } else {
                process_normal(
                    &mut rx,
                    &status,
                    &app,
                    item.anime_id,
                    &item.anime_title,
                    cur_season,
                    cur_ep,
                    entry.series.id,
                    &entry.series.private_id,
                )
                .await
            };

            match result {
                EpResult::Done(watch_secs) => {
                    ep_retries = 0;
                    global_backoff = 0;
                    total_seconds += watch_secs;

                    {
                        let conn = db.lock().await;
                        let _ = queue::record_watch(
                            &conn,
                            item.anime_id,
                            &item.anime_title,
                            cur_season,
                            cur_ep,
                            entry.series.id,
                            watch_secs,
                            watch_secs,
                            true,
                        );
                    }

                    farmed += 1;
                    total_farmed += 1;
                    daily_episodes += 1;

                    // Save NEXT episode position
                    let (save_season, save_ep) = match nav.next_after(cur_season, cur_ep) {
                        Some(next) => (next.season, next.episode),
                        None => (cur_season, cur_ep),
                    };
                    {
                        let conn = db.lock().await;
                        let _ = queue::update_progress(&conn, item.id, save_ep, save_season, farmed);
                        let _ = queue::update_session(&conn, session_id, total_farmed, total_seconds);
                    }

                    let _ = app.emit(
                        "marathon:episode-done",
                        EpisodeDoneEvent {
                            anime_title: item.anime_title.clone(),
                            episode: cur_ep,
                            season: cur_season,
                        },
                    );

                    // Advance
                    match nav.next_after(cur_season, cur_ep) {
                        Some(next) => {
                            cur_season = next.season;
                            cur_ep = next.episode;
                        }
                        None => {
                            let conn = db.lock().await;
                            let _ = queue::mark_done(&conn, item.id);
                            let _ = queue::record_farmed(&conn, item.anime_id, farmed);
                            break 'episodes;
                        }
                    }

                    // Update status
                    {
                        let remaining = {
                            let conn = db.lock().await;
                            queue::count_remaining(&conn).unwrap_or(0)
                        };
                        let mut s = status.write().await;
                        s.current_episode = Some(cur_ep);
                        s.current_season = Some(cur_season);
                        s.total_farmed = total_farmed;
                        s.queue_remaining = remaining;
                        s.episodes_per_hour = calc_eps_per_hour(total_farmed, session_start);
                        let _ = app.emit("marathon:status", s.clone());
                    }

                    // Binge logic + delays
                    binge_remaining = binge_remaining.saturating_sub(1);

                    if binge_remaining == 0 {
                        let brk = rand_delay_secs(&mut rng, config.binge_break_min, config.binge_break_max);
                        {
                            let mut s = status.write().await;
                            s.on_break = true;
                            s.break_ends_at = Some(now_secs() + brk.as_secs());
                            let _ = app.emit("marathon:status", s.clone());
                        }
                        let brk_outcome =
                            sleep_interruptible(&mut rx, brk, &status, &app).await;
                        {
                            let mut s = status.write().await;
                            s.on_break = false;
                            s.break_ends_at = None;
                            let _ = app.emit("marathon:status", s.clone());
                        }
                        match brk_outcome {
                            SleepOutcome::Stop => {
                                let conn = db.lock().await;
                                let _ = queue::update_progress(
                                    &conn, item.id, cur_ep, cur_season, farmed,
                                );
                                break 'main;
                            }
                            SleepOutcome::Skip => {
                                let conn = db.lock().await;
                                let _ = queue::update_progress(
                                    &conn, item.id, cur_ep, cur_season, farmed,
                                );
                                let _ = queue::mark_skipped(&conn, item.id);
                                break 'episodes;
                            }
                            SleepOutcome::Completed => {}
                        }
                        binge_remaining = rand_binge_size(&mut rng, config.binge_min, config.binge_max);
                    } else {
                        let delay =
                            rand_delay_secs(&mut rng, config.delay_between_min, config.delay_between_max);
                        match sleep_interruptible(&mut rx, delay, &status, &app).await {
                            SleepOutcome::Stop => {
                                let conn = db.lock().await;
                                let _ = queue::update_progress(
                                    &conn, item.id, cur_ep, cur_season, farmed,
                                );
                                break 'main;
                            }
                            SleepOutcome::Skip => {
                                let conn = db.lock().await;
                                let _ = queue::update_progress(
                                    &conn, item.id, cur_ep, cur_season, farmed,
                                );
                                let _ = queue::mark_skipped(&conn, item.id);
                                break 'episodes;
                            }
                            SleepOutcome::Completed => {}
                        }
                    }

                    // Random AFK
                    if chance(&mut rng, config.long_afk_chance) {
                        let afk = rand_delay_secs(&mut rng, config.long_afk_min, config.long_afk_max);
                        let _ = sleep_interruptible(&mut rx, afk, &status, &app).await;
                    } else if chance(&mut rng, config.afk_chance) {
                        let afk = rand_delay_secs(&mut rng, config.afk_min, config.afk_max);
                        let _ = sleep_interruptible(&mut rx, afk, &status, &app).await;
                    }
                }

                EpResult::Stop => {
                    let conn = db.lock().await;
                    let _ = queue::update_progress(&conn, item.id, cur_ep, cur_season, farmed);
                    break 'main;
                }

                EpResult::SkipAnime => {
                    let conn = db.lock().await;
                    let _ = queue::update_progress(&conn, item.id, cur_ep, cur_season, farmed);
                    let _ = queue::mark_skipped(&conn, item.id);
                    break 'episodes;
                }

                EpResult::Error(e) => {
                    ep_retries += 1;
                    emit_error(&app, &format!("S{}E{}: {}", cur_season, cur_ep, e), true);

                    if ep_retries >= config.max_ep_retries {
                        ep_retries = 0;
                        match nav.next_after(cur_season, cur_ep) {
                            Some(next) => {
                                cur_season = next.season;
                                cur_ep = next.episode;
                            }
                            None => {
                                let conn = db.lock().await;
                                let _ = queue::mark_done(&conn, item.id);
                                break 'episodes;
                            }
                        }
                    } else {
                        let backoff = backoff_duration(
                            &mut rng,
                            ep_retries,
                            config.backoff_base,
                            config.backoff_max,
                        );
                        match sleep_interruptible(&mut rx, backoff, &status, &app).await {
                            SleepOutcome::Stop => {
                                let conn = db.lock().await;
                                let _ = queue::update_progress(
                                    &conn, item.id, cur_ep, cur_season, farmed,
                                );
                                break 'main;
                            }
                            _ => {}
                        }
                    }
                }
            }
        }
    }

    // ── Finalize ──
    let remaining = {
        let conn = db.lock().await;
        queue::count_remaining(&conn).unwrap_or(0)
    };
    let final_status = if remaining == 0 { "completed" } else { "stopped" };
    {
        let conn = db.lock().await;
        let _ = queue::end_session(&conn, session_id, final_status);
    }

    let _ = app.emit(
        "marathon:complete",
        MarathonCompleteEvent {
            total_episodes: total_farmed,
            total_time_sec: total_seconds,
        },
    );
}

// ═══════════════════════════════════════
// Headless Episode Processing
// ═══════════════════════════════════════

async fn process_headless(
    rx: &mut mpsc::Receiver<MarathonSignal>,
    client: &AnimixClient,
    status: &Arc<RwLock<MarathonStatus>>,
    app: &AppHandle,
    series_id: u64,
    config: &MarathonConfig,
    rng: &mut StdRng,
) -> EpResult {
    if let Err(e) = start_watch_retry(client, series_id).await {
        return EpResult::Error(format!("startWatch: {}", e));
    }
    let start = Instant::now();

    let duration = rand_gaussian_duration(rng, config.ep_duration_min, config.ep_duration_max);
    match sleep_interruptible(rx, duration, status, app).await {
        SleepOutcome::Completed => {}
        SleepOutcome::Stop => {
            let elapsed = start.elapsed().as_secs();
            end_watch_safe(client, series_id, safe_time_sec(elapsed, elapsed)).await;
            return EpResult::Stop;
        }
        SleepOutcome::Skip => {
            let elapsed = start.elapsed().as_secs();
            end_watch_safe(client, series_id, safe_time_sec(elapsed, elapsed)).await;
            return EpResult::SkipAnime;
        }
    }

    let wall = start.elapsed().as_secs();
    let mut time_sec = safe_time_sec(duration.as_secs(), wall);

    // Partial watch — simulate not finishing
    if chance(rng, config.partial_chance) {
        let factor = rng.gen_range(config.partial_min..=config.partial_max);
        time_sec = ((time_sec as f64) * factor) as u64;
        time_sec = time_sec.max(1);
    }

    end_watch_safe(client, series_id, time_sec).await;
    EpResult::Done(time_sec)
}

// ═══════════════════════════════════════
// Normal Episode Processing (with player)
// ═══════════════════════════════════════

async fn process_normal(
    rx: &mut mpsc::Receiver<MarathonSignal>,
    status: &Arc<RwLock<MarathonStatus>>,
    app: &AppHandle,
    anime_id: u64,
    anime_title: &str,
    season: u32,
    episode: u32,
    series_id: u64,
    private_id: &str,
) -> EpResult {
    let _ = app.emit(
        "marathon:play-episode",
        PlayEpisodeEvent {
            anime_id,
            anime_title: anime_title.to_string(),
            season,
            episode,
            series_id,
            private_id: private_id.to_string(),
        },
    );

    loop {
        match rx.recv().await {
            Some(MarathonSignal::EpisodeDone(_)) => return EpResult::Done(0),
            Some(MarathonSignal::Stop) | None => return EpResult::Stop,
            Some(MarathonSignal::Skip) => return EpResult::SkipAnime,
            Some(MarathonSignal::Pause) => {
                {
                    let mut s = status.write().await;
                    s.paused = true;
                    let _ = app.emit("marathon:status", s.clone());
                }
                loop {
                    match rx.recv().await {
                        Some(MarathonSignal::Resume) => {
                            let mut s = status.write().await;
                            s.paused = false;
                            let _ = app.emit("marathon:status", s.clone());
                            break;
                        }
                        Some(MarathonSignal::Stop) | None => return EpResult::Stop,
                        Some(MarathonSignal::Skip) => return EpResult::SkipAnime,
                        Some(MarathonSignal::EpisodeDone(_)) => return EpResult::Done(0),
                        _ => {}
                    }
                }
            }
            Some(MarathonSignal::Resume) => {}
        }
    }
}

// ═══════════════════════════════════════
// Auto-pick anime from catalog
// ═══════════════════════════════════════

async fn auto_pick_anime(
    client: &AnimixClient,
    db: &Arc<TokioMutex<rusqlite::Connection>>,
    config: &MarathonConfig,
    rng: &mut StdRng,
) -> Result<u32, String> {
    let farmed_ids = {
        let conn = db.lock().await;
        queue::get_recently_farmed_ids(&conn, config.dedup_days)?
    };
    let mut added: u32 = 0;

    for _ in 0..8 {
        let page: u32 = rng.gen_range(3..250);
        let anime_list = match client.get_all(page).await {
            Ok(list) => list,
            Err(_) => continue,
        };

        if anime_list.is_empty() {
            continue;
        }

        let mut candidates: Vec<&Anime> = anime_list
            .iter()
            .filter(|a| a.available && a.viral < config.auto_pick_max_viral)
            .collect();

        // Shuffle
        for i in (1..candidates.len()).rev() {
            let j = rng.gen_range(0..=i);
            candidates.swap(i, j);
        }

        for anime in candidates.iter().take(4) {
            if farmed_ids.contains(&anime.id) {
                continue;
            }
            {
                let conn = db.lock().await;
                if queue::is_in_queue(&conn, anime.id)? {
                    continue;
                }
            }

            let seasons = match client.get_series(anime.id).await {
                Ok(s) => s,
                Err(_) => continue,
            };

            let ep_count: u32 = seasons
                .values()
                .flat_map(|eps| eps.iter())
                .filter(|s| s.status == 3)
                .count() as u32;

            if ep_count == 0 || ep_count > config.auto_pick_max_episodes {
                continue;
            }

            {
                let conn = db.lock().await;
                let _ = queue::add(&conn, anime.id, &anime.name, ep_count, 1, None);
            }
            added += 1;

            if added >= 3 {
                return Ok(added);
            }
        }

        if added > 0 {
            return Ok(added);
        }
    }

    Ok(added)
}

// ═══════════════════════════════════════
// Interruptible Sleep
// ═══════════════════════════════════════

async fn sleep_interruptible(
    rx: &mut mpsc::Receiver<MarathonSignal>,
    total: Duration,
    status: &Arc<RwLock<MarathonStatus>>,
    app: &AppHandle,
) -> SleepOutcome {
    let mut remaining = total;

    loop {
        if remaining.is_zero() {
            return SleepOutcome::Completed;
        }

        let seg_start = Instant::now();

        tokio::select! {
            _ = tokio::time::sleep(remaining) => {
                return SleepOutcome::Completed;
            }
            signal = rx.recv() => {
                match signal {
                    Some(MarathonSignal::Stop) | None => return SleepOutcome::Stop,
                    Some(MarathonSignal::Skip) => return SleepOutcome::Skip,
                    Some(MarathonSignal::Pause) => {
                        remaining = remaining.saturating_sub(seg_start.elapsed());
                        {
                            let mut s = status.write().await;
                            s.paused = true;
                            let _ = app.emit("marathon:status", s.clone());
                        }
                        loop {
                            match rx.recv().await {
                                Some(MarathonSignal::Resume) => {
                                    let mut s = status.write().await;
                                    s.paused = false;
                                    let _ = app.emit("marathon:status", s.clone());
                                    break;
                                }
                                Some(MarathonSignal::Stop) | None => return SleepOutcome::Stop,
                                Some(MarathonSignal::Skip) => return SleepOutcome::Skip,
                                _ => {}
                            }
                        }
                    }
                    Some(_) => {
                        remaining = remaining.saturating_sub(seg_start.elapsed());
                    }
                }
            }
        }
    }
}

/// Wait until a condition is true, checking every 5 minutes.
async fn wait_until<F: Fn() -> bool>(
    rx: &mut mpsc::Receiver<MarathonSignal>,
    status: &Arc<RwLock<MarathonStatus>>,
    app: &AppHandle,
    condition: F,
) -> SleepOutcome {
    loop {
        if condition() {
            return SleepOutcome::Completed;
        }
        match sleep_interruptible(rx, Duration::from_secs(300), status, app).await {
            SleepOutcome::Completed => {}
            other => return other,
        }
    }
}

// ═══════════════════════════════════════
// API Helpers
// ═══════════════════════════════════════

async fn start_watch_retry(
    client: &AnimixClient,
    series_id: u64,
) -> Result<StartWatchData, String> {
    for attempt in 0..3u32 {
        match client.start_watch(series_id).await {
            Ok(data) => return Ok(data),
            Err(e) => {
                if attempt < 2 {
                    tokio::time::sleep(Duration::from_secs(5 * (attempt as u64 + 1))).await;
                } else {
                    return Err(e);
                }
            }
        }
    }
    Err("Max retries".into())
}

async fn end_watch_safe(client: &AnimixClient, series_id: u64, time_sec: u64) {
    if time_sec == 0 {
        return;
    }
    match client.end_watch(series_id, time_sec).await {
        Ok(_) => {}
        Err(e) if e.contains("413") => {
            let reduced = (time_sec as f64 * 0.75) as u64;
            if reduced > 0 {
                let _ = client.end_watch(series_id, reduced).await;
            }
        }
        Err(_) => {}
    }
}

fn safe_time_sec(desired: u64, wall_elapsed: u64) -> u64 {
    let max_safe = (wall_elapsed as f64 * 0.92) as u64;
    desired.min(max_safe).max(1)
}

// ═══════════════════════════════════════
// Randomization Utilities (all take &mut StdRng)
// ═══════════════════════════════════════

fn rand_binge_size(rng: &mut StdRng, min: u32, max: u32) -> u32 {
    if min >= max {
        return min;
    }
    rng.gen_range(min..=max)
}

fn rand_delay_secs(rng: &mut StdRng, min_secs: u64, max_secs: u64) -> Duration {
    if min_secs >= max_secs {
        return Duration::from_secs(min_secs);
    }
    Duration::from_secs(rng.gen_range(min_secs..=max_secs))
}

/// Duration with pseudo-gaussian distribution (CLT: avg of 3 uniforms).
fn rand_gaussian_duration(rng: &mut StdRng, min_secs: u64, max_secs: u64) -> Duration {
    if min_secs >= max_secs {
        return Duration::from_secs(min_secs);
    }
    let sum: f64 = (0..3).map(|_| rng.gen::<f64>()).sum::<f64>() / 3.0;
    let range = max_secs - min_secs;
    let val = min_secs as f64 + sum * range as f64;
    Duration::from_secs(val.round().max(min_secs as f64).min(max_secs as f64) as u64)
}

fn chance(rng: &mut StdRng, probability: f64) -> bool {
    rng.gen::<f64>() < probability
}

/// Check if current UTC hour is within the night window.
fn is_night_now(night_start_hour: u32, night_end_hour: u32) -> bool {
    let hour = ((now_secs() % 86400) / 3600) as u32;
    if night_start_hour <= night_end_hour {
        hour >= night_start_hour && hour < night_end_hour
    } else {
        hour >= night_start_hour || hour < night_end_hour
    }
}

// ═══════════════════════════════════════
// General Utilities
// ═══════════════════════════════════════

fn backoff_duration(rng: &mut StdRng, level: u32, base: u64, max: u64) -> Duration {
    let secs = (base * 2u64.pow(level.min(10))).min(max);
    let jitter = (secs as f64 * rng.gen_range(-0.2..0.2)) as i64;
    Duration::from_secs((secs as i64 + jitter).max(1) as u64)
}

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn day_of_year() -> u32 {
    (now_secs() / 86400) as u32
}

fn calc_eps_per_hour(total_farmed: u32, session_start_secs: u64) -> f64 {
    if total_farmed == 0 {
        return 0.0;
    }
    let elapsed = now_secs().saturating_sub(session_start_secs);
    if elapsed == 0 {
        return 0.0;
    }
    (total_farmed as f64) / (elapsed as f64 / 3600.0)
}

fn emit_error(app: &AppHandle, message: &str, will_retry: bool) {
    let _ = app.emit(
        "marathon:error",
        MarathonErrorEvent {
            message: message.to_string(),
            will_retry,
        },
    );
}