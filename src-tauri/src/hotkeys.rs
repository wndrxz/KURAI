// Hotkeys are handled entirely on the frontend via the useKeyboard hook
// and configurable bindings stored in SQLite (settings.hotkeys JSON).
// This module is reserved for potential future global shortcuts.

pub fn register(_app: &tauri::App) {
    // No global shortcuts — all hotkeys are in-app only.
}