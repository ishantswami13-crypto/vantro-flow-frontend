// Starlane desktop — native shell.
//
// What lives in Rust (and why):
//   - Secret storage: sessions and connector device credentials go to the OS
//     credential store (Windows Credential Manager, macOS Keychain, Linux
//     Secret Service) through the `keyring` crate. The web view never sees a
//     file or localStorage copy.
//   - Background mode: closing the window hides it; Starlane keeps syncing
//     local connectors and delivering notifications from the tray until the
//     user chooses Quit.
//   - Single instance + deep links (starlane://actions/<id>) focus the running
//     window and route to the exact item.
//   - Updates: the channel (stable/beta) is chosen at runtime; artifacts are
//     signature-verified by the updater plugin against the public key baked
//     into the build. Builds without a key report "updates not configured".
//
// Everything the user sees is the web view (desktop/src), built on the shared
// Starlane API client (packages/contracts).

use serde::Serialize;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent,
};
use tauri_plugin_updater::UpdaterExt;

const KEYRING_SERVICE: &str = "app.starlane.desktop";
const STABLE_ENDPOINT: &str =
    "https://github.com/ishantswami13-crypto/vantro-flow-frontend/releases/latest/download/latest.json";
const BETA_ENDPOINT: &str =
    "https://github.com/ishantswami13-crypto/vantro-flow-frontend/releases/download/desktop-beta/latest.json";

// Only these keys may be stored — the web view cannot use the keyring as a
// general-purpose store.
fn allowed_key(key: &str) -> bool {
    key == "session" || key == "device:tally" || key == "prefs"
}

#[tauri::command]
fn secret_get(key: String) -> Result<Option<String>, String> {
    if !allowed_key(&key) {
        return Err("key not allowed".into());
    }
    let entry = keyring::Entry::new(KEYRING_SERVICE, &key).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn secret_set(key: String, value: String) -> Result<(), String> {
    if !allowed_key(&key) {
        return Err("key not allowed".into());
    }
    if value.len() > 16 * 1024 {
        return Err("value too large".into());
    }
    keyring::Entry::new(KEYRING_SERVICE, &key)
        .and_then(|e| e.set_password(&value))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn secret_delete(key: String) -> Result<(), String> {
    if !allowed_key(&key) {
        return Err("key not allowed".into());
    }
    match keyring::Entry::new(KEYRING_SERVICE, &key).and_then(|e| e.delete_credential()) {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[derive(Serialize)]
struct AppInfo {
    version: String,
    os: &'static str,
    arch: &'static str,
    device_name: String,
    updater_configured: bool,
}

#[tauri::command]
fn app_info(app: AppHandle) -> AppInfo {
    let device_name = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "This computer".into());
    AppInfo {
        version: app.package_info().version.to_string(),
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        device_name,
        updater_configured: option_env!("STARLANE_UPDATER_CONFIGURED").is_some(),
    }
}

#[derive(Serialize)]
struct UpdateInfo {
    available: bool,
    version: Option<String>,
    notes: Option<String>,
    configured: bool,
}

fn endpoint_for(channel: &str) -> Result<url::Url, String> {
    let u = if channel == "beta" { BETA_ENDPOINT } else { STABLE_ENDPOINT };
    url::Url::parse(u).map_err(|e| e.to_string())
}

#[tauri::command]
async fn check_update(app: AppHandle, channel: String) -> Result<UpdateInfo, String> {
    if option_env!("STARLANE_UPDATER_CONFIGURED").is_none() {
        return Ok(UpdateInfo { available: false, version: None, notes: None, configured: false });
    }
    let updater = app
        .updater_builder()
        .endpoints(vec![endpoint_for(&channel)?])
        .map_err(|e| e.to_string())?
        .build()
        .map_err(|e| e.to_string())?;
    match updater.check().await.map_err(|e| e.to_string())? {
        Some(u) => Ok(UpdateInfo { available: true, version: Some(u.version.clone()), notes: u.body.clone(), configured: true }),
        None => Ok(UpdateInfo { available: false, version: None, notes: None, configured: true }),
    }
}

/// Downloads, verifies (signature against the embedded public key) and installs.
/// The caller restarts the app afterwards (plugin-process `relaunch`).
#[tauri::command]
async fn install_update(app: AppHandle, channel: String) -> Result<String, String> {
    if option_env!("STARLANE_UPDATER_CONFIGURED").is_none() {
        return Err("Updates are not configured for this build".into());
    }
    let updater = app
        .updater_builder()
        .endpoints(vec![endpoint_for(&channel)?])
        .map_err(|e| e.to_string())?
        .build()
        .map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?.ok_or("No update available")?;
    let version = update.version.clone();
    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|e| e.to_string())?;
    Ok(version)
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// starlane://actions/<id> -> "/actions/<id>" for the web view router.
fn route_from_url(raw: &str) -> Option<String> {
    let u = url::Url::parse(raw).ok()?;
    if u.scheme() != "starlane" {
        return None;
    }
    let host = u.host_str().unwrap_or("");
    let path = format!("/{}{}", host, u.path());
    // Only simple, known route shapes are forwarded.
    let ok = path.chars().all(|c| c.is_ascii_alphanumeric() || "/-_".contains(c));
    if ok { Some(path.trim_end_matches('/').to_string()) } else { None }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            show_main(app);
            if let Some(route) = argv.iter().find_map(|a| route_from_url(a)) {
                let _ = app.emit("starlane://route", route);
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--background"]),
        ))
        .invoke_handler(tauri::generate_handler![
            secret_get,
            secret_set,
            secret_delete,
            app_info,
            check_update,
            install_update
        ])
        .setup(|app| {
            // Tray: the way back into Starlane while it works in the background.
            let open = MenuItem::with_id(app, "open", "Open Starlane", true, None::<&str>)?;
            let sync = MenuItem::with_id(app, "sync", "Sync now", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Starlane", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &sync, &quit])?;
            let mut tray = TrayIconBuilder::with_id("starlane")
                .tooltip("Starlane")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => show_main(app),
                    "sync" => {
                        let _ = app.emit("starlane://sync-now", ());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        show_main(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;

            // Launched at login with --background: start hidden in the tray.
            if std::env::args().any(|a| a == "--background") {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }

            // Deep links on first launch (Windows/Linux pass them as args).
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let _ = app.deep_link().register_all();
            }
            let handle = app.handle().clone();
            if let Some(route) = std::env::args().find_map(|a| route_from_url(&a)) {
                let _ = handle.emit("starlane://route", route);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Close = keep working in the background (tray). Quit is explicit.
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                    let _ = window.emit("starlane://hidden", ());
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Starlane");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn deep_link_routes() {
        assert_eq!(route_from_url("starlane://actions/8b1f0c0e-1").as_deref(), Some("/actions/8b1f0c0e-1"));
        assert_eq!(route_from_url("starlane://sources/tally").as_deref(), Some("/sources/tally"));
        assert_eq!(route_from_url("https://evil.test/actions/1"), None);
        assert_eq!(route_from_url("starlane://actions/1?x=<script>"), Some("/actions/1".into()));
        assert_eq!(route_from_url("starlane://actions/a%20b"), None);
    }
    #[test]
    fn keyring_keys_are_allowlisted() {
        assert!(allowed_key("session"));
        assert!(allowed_key("device:tally"));
        assert!(!allowed_key("anything-else"));
    }
}
