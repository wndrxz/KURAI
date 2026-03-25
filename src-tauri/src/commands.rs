use crate::animix::cache;
use crate::animix::types::*;
use crate::marathon;
use crate::marathon::engine::{self, MarathonSignal};
use crate::marathon::queue::SessionInfo;
use crate::AppState;
use base64::Engine;
use futures::future::join_all;
use std::collections::HashMap;
use tauri::Manager;
use tauri::State;

// ═══════════════════════════════════════
// AUTH
// ═══════════════════════════════════════

#[tauri::command]
pub async fn login(
    login: String,
    password: String,
    remember: bool,
    state: State<'_, AppState>,
) -> Result<UserInfo, String> {
    let login_data = state.client.login(&login, &password).await?;

    state.client.set_token(login_data.key.clone()).await;
    state.client.set_account_id(login_data.account_id).await;

    let user = match state.client.get_self().await {
        Ok(u) => u,
        Err(e) => {
            state.client.clear_auth().await;
            return Err(e);
        }
    };

    let info = UserInfo::from(user);

    if remember {
        let encrypted = crate::crypto::encrypt(&login_data.key)?;
        let user_json = serde_json::to_string(&info).map_err(|e| e.to_string())?;
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('auth_token', ?1, unixepoch())",
            [&encrypted],
        )
        .map_err(|e| e.to_string())?;
        db.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('account_id', ?1, unixepoch())",
            [&login_data.account_id.to_string()],
        )
        .map_err(|e| e.to_string())?;
        db.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('cached_user', ?1, unixepoch())",
            [&user_json],
        )
        .map_err(|e| e.to_string())?;
    } else {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.execute(
            "DELETE FROM settings WHERE key IN ('auth_token', 'account_id', 'cached_user')",
            [],
        )
        .ok();
    }

    Ok(info)
}

#[tauri::command]
pub async fn logout(state: State<'_, AppState>) -> Result<(), String> {
    if state.marathon.is_running().await {
        let _ = state.marathon.send(MarathonSignal::Stop).await;
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    }

    state.client.clear_auth().await;
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "DELETE FROM settings WHERE key IN ('auth_token', 'account_id', 'cached_user')",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_current_user(state: State<'_, AppState>) -> Result<Option<UserInfo>, String> {
    if state.client.is_authenticated().await {
        let cached = {
            let db = state.db.lock().map_err(|e| e.to_string())?;
            db.query_row(
                "SELECT value FROM settings WHERE key = 'cached_user'",
                [],
                |row| row.get::<_, String>(0),
            )
            .ok()
        };

        if let Some(json) = cached {
            if let Ok(info) = serde_json::from_str::<UserInfo>(&json) {
                return Ok(Some(info));
            }
        }

        return match state.client.get_self().await {
            Ok(user) => Ok(Some(UserInfo::from(user))),
            Err(_) => {
                state.client.clear_auth().await;
                Ok(None)
            }
        };
    }

    let (token_enc, account_id_opt, cached_user_json) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let t = db
            .query_row(
                "SELECT value FROM settings WHERE key = 'auth_token'",
                [],
                |row| row.get::<_, String>(0),
            )
            .ok();
        let a = db
            .query_row(
                "SELECT value FROM settings WHERE key = 'account_id'",
                [],
                |row| row.get::<_, String>(0),
            )
            .ok()
            .and_then(|s| s.parse::<u64>().ok());
        let u = db
            .query_row(
                "SELECT value FROM settings WHERE key = 'cached_user'",
                [],
                |row| row.get::<_, String>(0),
            )
            .ok();
        (t, a, u)
    };

    let encrypted = match token_enc {
        Some(t) => t,
        None => return Ok(None),
    };

    let token = match crate::crypto::decrypt(&encrypted) {
        Ok(t) => t,
        Err(_) => {
            let db = state.db.lock().map_err(|e| e.to_string())?;
            db.execute(
                "DELETE FROM settings WHERE key IN ('auth_token', 'account_id', 'cached_user')",
                [],
            )
            .ok();
            return Ok(None);
        }
    };

    state.client.set_token(token).await;
    if let Some(aid) = account_id_opt {
        state.client.set_account_id(aid).await;
    }

    if let Some(json) = cached_user_json {
        if let Ok(info) = serde_json::from_str::<UserInfo>(&json) {
            return Ok(Some(info));
        }
    }

    match state.client.get_self().await {
        Ok(user) => {
            let info = UserInfo::from(user);
            if let Ok(json) = serde_json::to_string(&info) {
                let db = state.db.lock().map_err(|e| e.to_string())?;
                db.execute(
                    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('cached_user', ?1, unixepoch())",
                    [&json],
                )
                .ok();
            }
            Ok(Some(info))
        }
        Err(_) => {
            state.client.clear_auth().await;
            Ok(None)
        }
    }
}

#[tauri::command]
pub async fn is_logged_in(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(state.client.is_authenticated().await)
}

// ═══════════════════════════════════════
// CATALOG
// ═══════════════════════════════════════

#[tauri::command]
pub async fn catalog_get_all(page: u32, state: State<'_, AppState>) -> Result<Vec<Anime>, String> {
    state.client.get_all(page).await
}

#[tauri::command]
pub async fn catalog_get(id: u64, state: State<'_, AppState>) -> Result<Anime, String> {
    state.client.get_anime(id).await
}

#[tauri::command]
pub async fn catalog_search(
    query: String,
    page: u32,
    state: State<'_, AppState>,
) -> Result<Vec<SearchAnime>, String> {
    state
        .client
        .search_filtered(SearchParams {
            query: Some(query),
            page,
            genres: None,
            studio: None,
            movie: None,
            hq: None,
            min_rating: None,
            max_rating: None,
        })
        .await
}

#[tauri::command]
pub async fn catalog_search_filtered(
    params: SearchParams,
    state: State<'_, AppState>,
) -> Result<Vec<SearchAnime>, String> {
    state.client.search_filtered(params).await
}

#[tauri::command]
pub async fn catalog_get_categories(state: State<'_, AppState>) -> Result<Vec<Category>, String> {
    state.client.get_categories().await
}

#[tauri::command]
pub async fn catalog_get_recommendations(
    state: State<'_, AppState>,
) -> Result<Recommendations, String> {
    state.client.get_recommendations().await
}

// ═══════════════════════════════════════
// SERIES
// ═══════════════════════════════════════

#[tauri::command]
pub async fn get_series(
    anime_id: u64,
    state: State<'_, AppState>,
) -> Result<HashMap<String, Vec<Series>>, String> {
    state.client.get_series(anime_id).await
}

#[tauri::command]
pub async fn get_qualities(
    anime_id: u64,
    season: u32,
    episode: u32,
    state: State<'_, AppState>,
) -> Result<Vec<QualityOption>, String> {
    state
        .client
        .get_series_qualities(anime_id, season, episode)
        .await
}

// ═══════════════════════════════════════
// VIDEO
// ═══════════════════════════════════════

#[tauri::command]
pub async fn resolve_video(
    private_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    state.client.resolve_video_url(&private_id).await
}

// ═══════════════════════════════════════
// THUMBNAILS
// ═══════════════════════════════════════

#[tauri::command]
pub async fn get_anime_thumb(
    anime_id: u64,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let cached_thumb_id = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        cache::get_thumb_id(&db, anime_id)
    };

    let private_id = if let Some(tid) = cached_thumb_id {
        tid
    } else {
        let pid = match state.client.get_first_episode_private_id(anime_id).await {
            Ok(pid) => pid,
            Err(_) => return Ok(None),
        };
        {
            let db = state.db.lock().map_err(|e| e.to_string())?;
            cache::set_thumb_id(&db, anime_id, &pid);
        }
        pid
    };

    let url = thumb_url(&private_id);
    let auth = state.client.auth_header().await?;
    let resp = state
        .client
        .http
        .get(&url)
        .header("Authorization", &auth)
        .send()
        .await
        .map_err(|e| format!("Thumb fetch failed: {}", e))?;

    if !resp.status().is_success() {
        return Ok(None);
    }

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    Ok(Some(format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(&bytes)
    )))
}

// ═══════════════════════════════════════
// PROGRESS
// ═══════════════════════════════════════

#[tauri::command]
pub async fn start_watch(
    series_id: u64,
    state: State<'_, AppState>,
) -> Result<StartWatchData, String> {
    state.client.start_watch(series_id).await
}

#[tauri::command]
pub async fn end_watch(
    series_id: u64,
    time_sec: u64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.client.end_watch(series_id, time_sec).await
}

#[tauri::command]
pub async fn get_last_watch(state: State<'_, AppState>) -> Result<Vec<WatchEntry>, String> {
    state.client.get_last_watch().await
}

#[tauri::command]
pub async fn get_watch_history(
    page: u32,
    state: State<'_, AppState>,
) -> Result<Vec<WatchEntry>, String> {
    let account_id = state
        .client
        .get_account_id()
        .await
        .ok_or("No account ID")?;
    state.client.get_user_watch_history(account_id, page).await
}

// ═══════════════════════════════════════
// SKIP MARKS
// ═══════════════════════════════════════

#[tauri::command]
pub async fn get_skip_marks(
    anime_id: u64,
    season: u32,
    episode: u32,
    state: State<'_, AppState>,
) -> Result<Vec<SkipMark>, String> {
    state
        .client
        .get_skip_marks(anime_id, season, episode)
        .await
}

// ═══════════════════════════════════════
// COLLECTIONS
// ═══════════════════════════════════════

#[tauri::command]
pub async fn get_collections(state: State<'_, AppState>) -> Result<Vec<Collection>, String> {
    let account_id = state
        .client
        .get_account_id()
        .await
        .ok_or("No account ID")?;
    state.client.get_collections(account_id).await
}

// ═══════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════

#[tauri::command]
pub async fn get_notifications(
    page: u32,
    state: State<'_, AppState>,
) -> Result<Vec<Notification>, String> {
    state.client.get_notifications(page).await
}

// ═══════════════════════════════════════
// MARATHON
// ═══════════════════════════════════════

#[tauri::command]
pub async fn marathon_add(
    anime_id: u64,
    anime_title: String,
    total_episodes: u32,
    start_ep: u32,
    end_ep: Option<u32>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    marathon::queue::add(&db, anime_id, &anime_title, total_episodes, start_ep, end_ep)
}

#[tauri::command]
pub async fn marathon_remove(id: u64, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    marathon::queue::remove(&db, id)
}

#[tauri::command]
pub async fn marathon_reorder(
    id: u64,
    new_position: u32,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    marathon::queue::reorder(&db, id, new_position)
}

#[tauri::command]
pub async fn marathon_get_queue(state: State<'_, AppState>) -> Result<Vec<QueueItem>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    marathon::queue::get_all(&db)
}

#[tauri::command]
pub async fn marathon_start(
    headless: bool,
    preset: Option<String>,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    if !state.client.is_authenticated().await {
        return Err("Not authenticated".into());
    }

    let config = match preset.as_deref() {
        Some(p) => crate::marathon::config::MarathonConfig::from_preset(p),
        None => crate::marathon::config::MarathonConfig::standard(),
    };

    let client = state.client.clone();
    let status = state.marathon.status.clone();
    let signal_holder = state.marathon.signal_tx.clone();
    let config_holder = state.marathon.config.clone();

    engine::start(status, signal_holder, config_holder, client, app, config, headless).await
}

#[tauri::command]
pub async fn marathon_stop(state: State<'_, AppState>) -> Result<(), String> {
    state.marathon.send(MarathonSignal::Stop).await
}

#[tauri::command]
pub async fn marathon_pause(state: State<'_, AppState>) -> Result<(), String> {
    state.marathon.send(MarathonSignal::Pause).await
}

#[tauri::command]
pub async fn marathon_resume(state: State<'_, AppState>) -> Result<(), String> {
    state.marathon.send(MarathonSignal::Resume).await
}

#[tauri::command]
pub async fn marathon_skip(state: State<'_, AppState>) -> Result<(), String> {
    state.marathon.send(MarathonSignal::Skip).await
}

#[tauri::command]
pub async fn marathon_get_status(state: State<'_, AppState>) -> Result<MarathonStatus, String> {
    Ok(state.marathon.get_status().await)
}

#[tauri::command]
pub async fn marathon_episode_done(
    series_id: u64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .marathon
        .send(MarathonSignal::EpisodeDone(series_id))
        .await
}

#[tauri::command]
pub async fn marathon_get_sessions(
    limit: u32,
    state: State<'_, AppState>,
) -> Result<Vec<SessionInfo>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    marathon::queue::get_sessions(&db, limit)
}

#[tauri::command]
pub async fn marathon_start_custom(
    config: crate::marathon::config::MarathonConfig,
    headless: bool,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    if !state.client.is_authenticated().await {
        return Err("Not authenticated".into());
    }

    let client = state.client.clone();
    let status = state.marathon.status.clone();
    let signal_holder = state.marathon.signal_tx.clone();
    let config_holder = state.marathon.config.clone();

    engine::start(status, signal_holder, config_holder, client, app, config, headless).await
}

#[tauri::command]
pub async fn marathon_reset_errors(state: State<'_, AppState>) -> Result<u32, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    marathon::queue::reset_errors(&db)
}

#[tauri::command]
pub async fn marathon_get_config(
    state: State<'_, AppState>,
) -> Result<Option<crate::marathon::config::MarathonConfig>, String> {
    Ok(state.marathon.get_config().await)
}

#[tauri::command]
pub async fn marathon_cleanup_watched(state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    marathon::queue::cleanup_watched(&db)
}

// ═══════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════

#[tauri::command]
pub async fn get_setting(key: String, state: State<'_, AppState>) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let result = db
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            [&key],
            |row| row.get(0),
        )
        .ok();
    Ok(result)
}

#[tauri::command]
pub async fn set_setting(
    key: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, unixepoch())",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_all_settings(
    state: State<'_, AppState>,
) -> Result<HashMap<String, String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;
    let map = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(map)
}

// ═══════════════════════════════════════
// BATCH ANIME
// ═══════════════════════════════════════

#[tauri::command]
pub async fn get_anime_batch(
    ids: Vec<u64>,
    state: State<'_, AppState>,
) -> Result<Vec<Anime>, String> {
    let capped = &ids[..ids.len().min(24)];
    let client = state.client.clone();
    let futs: Vec<_> = capped
        .iter()
        .map(|&id| {
            let c = client.clone();
            async move { c.get_anime(id).await }
        })
        .collect();
    let results = join_all(futs).await;
    Ok(results.into_iter().filter_map(|r| r.ok()).collect())
}

// ═══════════════════════════════════════
// AUTOSTART
// ═══════════════════════════════════════

#[tauri::command]
pub async fn toggle_autostart(enabled: bool, app: tauri::AppHandle) -> Result<(), String> {
    let manager = app.state::<tauri_plugin_autostart::AutoLaunchManager>();
    if enabled {
        manager.enable().map_err(|e| e.to_string())
    } else {
        manager.disable().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn is_autostart_enabled(app: tauri::AppHandle) -> Result<bool, String> {
    let manager = app.state::<tauri_plugin_autostart::AutoLaunchManager>();
    manager.is_enabled().map_err(|e| e.to_string())
}

// ═══════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════

#[tauri::command]
pub async fn send_notification(
    title: String,
    body: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())
}

// ═══════════════════════════════════════
// UPDATER STUB
// ═══════════════════════════════════════

#[tauri::command]
pub async fn check_for_updates() -> Result<String, String> {
    Ok("no_updates".to_string())
}