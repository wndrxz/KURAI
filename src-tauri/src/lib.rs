mod animix;
mod commands;
mod crypto;
mod db;
mod hotkeys;
mod marathon;
mod player;
mod tray;

use animix::client::AnimixClient;
use marathon::engine::MarathonState;
use std::sync::{Arc, Mutex};
use tauri::Manager;

pub struct AppState {
    pub client: Arc<AnimixClient>,
    pub db: Mutex<rusqlite::Connection>,
    pub marathon: MarathonState,
}

pub fn run() {
    let db_conn = db::init().expect("Failed to initialize database");
    let client = Arc::new(AnimixClient::new());

    tauri::Builder::default()
        // ── Single instance — MUST be first ──
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        // ── Other plugins ──
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        // ── State ──
        .manage(AppState {
            client,
            db: Mutex::new(db_conn),
            marathon: MarathonState::new(),
        })
        // ── Commands ──
        .invoke_handler(tauri::generate_handler![
            // Auth
            commands::login,
            commands::logout,
            commands::get_current_user,
            commands::is_logged_in,
            // Catalog
            commands::catalog_get_all,
            commands::catalog_get,
            commands::catalog_search,
            commands::catalog_search_filtered,
            commands::catalog_get_categories,
            commands::catalog_get_recommendations,
            // Series
            commands::get_series,
            commands::get_qualities,
            // Video
            commands::resolve_video,
            // Thumbnails
            commands::get_anime_thumb,
            // Progress
            commands::start_watch,
            commands::end_watch,
            commands::get_last_watch,
            commands::get_watch_history,
            // Skip marks
            commands::get_skip_marks,
            // Collections
            commands::get_collections,
            // Notifications
            commands::get_notifications,
            // Marathon
            commands::marathon_add,
            commands::marathon_remove,
            commands::marathon_reorder,
            commands::marathon_get_queue,
            commands::marathon_start,
            commands::marathon_stop,
            commands::marathon_pause,
            commands::marathon_resume,
            commands::marathon_skip,
            commands::marathon_get_status,
            commands::marathon_episode_done,
            commands::marathon_get_sessions,
            commands::marathon_start_custom,
            commands::marathon_reset_errors,
            commands::marathon_get_config,
            commands::marathon_cleanup_watched,
            // Settings
            commands::get_setting,
            commands::set_setting,
            commands::get_all_settings,
            // Step 7
            commands::get_anime_batch,
            commands::toggle_autostart,
            commands::is_autostart_enabled,
            commands::send_notification,
            commands::check_for_updates,
        ])
        // ── Tray setup ──
        .setup(|app| {
            tray::setup(app);
            hotkeys::register(app);
            Ok(())
        })
        // ── Close-to-tray ──
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let state = window.app_handle().state::<AppState>();
                let close_to_tray = {
                    if let Ok(db) = state.db.lock() {
                        db.query_row(
                            "SELECT value FROM settings WHERE key = 'close_to_tray'",
                            [],
                            |row| row.get::<_, String>(0),
                        )
                        .ok()
                        .map(|v| v == "true")
                        .unwrap_or(false)
                    } else {
                        false
                    }
                };

                if close_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}