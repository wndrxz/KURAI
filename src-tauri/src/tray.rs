use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::menu::{Menu, MenuItem};
use tauri::Manager;

pub fn setup(app: &tauri::App) {
    let icon = app
        .default_window_icon()
        .cloned()
        .expect("No default window icon set in tauri.conf.json");

    let show_i = MenuItem::with_id(app, "show", "Show KURAI", true, None::<&str>)
        .expect("failed to create menu item");
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)
        .expect("failed to create menu item");
    let menu = Menu::with_items(app, &[&show_i, &quit_i])
        .expect("failed to create tray menu");

    TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "show" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        })
        .build(app)
        .expect("failed to build tray icon");
}