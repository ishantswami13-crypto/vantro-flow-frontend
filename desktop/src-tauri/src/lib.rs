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
//   - Support logs: one rotating file in the app's log folder
//     (%LOCALAPPDATA%\app.starlane.desktop\logs on Windows). Only lifecycle
//     events, error codes and messages go there, never tokens, passwords or
//     business records; Settings > Diagnostics opens the folder.
//
// Two windows:
//   - "web": the live Starlane website (the same app as in a browser), so the
//     desktop always shows the latest version without a reinstall. It is a
//     remote page with NO access to any native command (capabilities only
//     cover "main"), and it can only navigate within the Starlane site;
//     anything else opens in the browser.
//   - "main": the local window (desktop/src): sign-in, the Tally connector
//     host and its settings. Once the live app is open it keeps running in the
//     background, reachable from the tray ("Tally connector"). If the website
//     cannot be opened (offline) it stays the visible app.

use serde::Serialize;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::UpdaterExt;

const KEYRING_SERVICE: &str = "app.starlane.desktop";
/// The live Starlane app shown in the "web" window.
const SITE: &str = "https://vantro-flow-frontend.vercel.app";
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
    let found = updater.check().await.map_err(|e| {
        log::warn!("update check failed on {channel}: {e}");
        e.to_string()
    })?;
    match found {
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
    log::info!("installing update {version} from {channel}");
    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|e| {
            log::error!("update {version} failed: {e}");
            e.to_string()
        })?;
    log::info!("update {version} installed; restarting");
    Ok(version)
}

/// Opens the folder that holds Starlane's support log.
#[tauri::command]
fn open_logs(app: AppHandle) -> Result<(), String> {
    let dir = app.path().app_log_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    app.opener()
        .open_path(dir.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| e.to_string())
}

fn show_window(app: &AppHandle, label: &str) -> bool {
    if let Some(w) = app.get_webview_window(label) {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
        return true;
    }
    false
}

/// "Open Starlane": the live app when it is open, else the local window.
fn show_main(app: &AppHandle) {
    if !show_window(app, "web") {
        show_window(app, "main");
    }
}

fn is_token(s: &str, min: usize, max: usize) -> bool {
    (min..=max).contains(&s.len()) && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

/// Only pages of the Starlane site may load in the live window.
fn on_site(url: &url::Url) -> bool {
    let site = url::Url::parse(SITE).expect("SITE is a valid URL");
    url.scheme() == site.scheme() && url.host_str() == site.host_str() && url.port_or_known_default() == site.port_or_known_default()
}

/// The URL that signs the live window in: the single-use code rides in the
/// fragment, which the browser never sends to a server.
fn web_signin_url(id: &str, code: &str, next: Option<&str>) -> Result<url::Url, String> {
    if !is_token(id, 16, 64) || !is_token(code, 16, 128) {
        return Err("invalid sign-in code".into());
    }
    let next = next.filter(|n| n.starts_with('/') && !n.starts_with("//") && n.len() <= 200 && n.chars().all(|c| c.is_ascii_alphanumeric() || "/-_".contains(c)));
    let mut frag = format!("id={id}&code={code}");
    if let Some(n) = next {
        frag.push_str("&next=");
        frag.push_str(n);
    }
    let mut u = url::Url::parse(SITE).map_err(|e| e.to_string())?.join("/auth/desktop").map_err(|e| e.to_string())?;
    u.set_fragment(Some(&frag));
    Ok(u)
}

/// Opens (or re-signs) the live Starlane window with a code the local window
/// just obtained from the API, then tucks the local window into the tray.
#[tauri::command]
async fn open_web(app: AppHandle, id: String, code: String, next: Option<String>) -> Result<(), String> {
    let url = web_signin_url(&id, &code, next.as_deref())?;
    // Started at login with --background: prepare it, but stay in the tray.
    let background = std::env::args().any(|a| a == "--background")
        && !app.get_webview_window("main").and_then(|w| w.is_visible().ok()).unwrap_or(false);
    if let Some(w) = app.get_webview_window("web") {
        w.navigate(url).map_err(|e| e.to_string())?;
        if !background {
            show_window(&app, "web");
        }
    } else {
        let handle = app.clone();
        WebviewWindowBuilder::new(&app, "web", WebviewUrl::External(url))
            .title("Starlane")
            .inner_size(1280.0, 820.0)
            .min_inner_size(960.0, 640.0)
            .center()
            .visible(!background)
            .on_navigation(move |u| {
                if on_site(u) || u.scheme() == "about" {
                    return true;
                }
                // Mail, other sites, downloads: the person's own browser.
                if matches!(u.scheme(), "https" | "http" | "mailto") {
                    let _ = handle.opener().open_url(u.as_str(), None::<&str>);
                }
                false
            })
            .build()
            .map_err(|e| e.to_string())?;
    }
    log::info!("live Starlane window opened");
    if !background {
        if let Some(m) = app.get_webview_window("main") {
            let _ = m.hide();
        }
    }
    Ok(())
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
        // First, so the other plugins' start-up is logged too.
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .level_for("tao", log::LevelFilter::Warn)
                .level_for("wry", log::LevelFilter::Warn)
                .level_for("reqwest", log::LevelFilter::Warn)
                .level_for("hyper", log::LevelFilter::Warn)
                .max_file_size(2 * 1024 * 1024)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(3))
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            log::info!("second launch forwarded to the running Starlane");
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
            install_update,
            open_logs,
            open_web
        ])
        .setup(|app| {
            log::info!(
                "Starlane {} starting on {} {}",
                app.package_info().version,
                std::env::consts::OS,
                std::env::consts::ARCH
            );
            // Tray: the way back into Starlane while it works in the background.
            let open = MenuItem::with_id(app, "open", "Open Starlane", true, None::<&str>)?;
            let connector = MenuItem::with_id(app, "connector", "Tally connector", true, None::<&str>)?;
            let sync = MenuItem::with_id(app, "sync", "Sync now", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Starlane", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &connector, &sync, &quit])?;
            let mut tray = TrayIconBuilder::with_id("starlane")
                .tooltip("Starlane")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => show_main(app),
                    "connector" => {
                        show_window(app, "main");
                    }
                    "sync" => {
                        let _ = app.emit("starlane://sync-now", ());
                    }
                    "quit" => {
                        log::info!("quit from tray");
                        app.exit(0)
                    }
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
                if window.label() == "main" || window.label() == "web" {
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
        // Browser sign-in hands back state and a single-use code as path parts.
        assert_eq!(route_from_url("starlane://auth/AbC_-12345678901234/x_Y-z0").as_deref(), Some("/auth/AbC_-12345678901234/x_Y-z0"));
        assert_eq!(route_from_url("https://evil.test/actions/1"), None);
        assert_eq!(route_from_url("starlane://actions/1?x=<script>"), Some("/actions/1".into()));
        assert_eq!(route_from_url("starlane://actions/a%20b"), None);
    }
    #[test]
    fn web_signin_url_is_built_safely() {
        let u = web_signin_url("AbCdEfGhIjKlMnOp", "c0de_c0de-c0de_c0de", Some("/decisions/1")).unwrap();
        assert_eq!(u.as_str(), "https://vantro-flow-frontend.vercel.app/auth/desktop#id=AbCdEfGhIjKlMnOp&code=c0de_c0de-c0de_c0de&next=/decisions/1");
        assert!(web_signin_url("short", "c0de_c0de-c0de_c0de", None).is_err());
        assert!(web_signin_url("AbCdEfGhIjKlMnOp", "bad code&x=1", None).is_err());
        // A next that leaves the site is dropped, not followed.
        let u = web_signin_url("AbCdEfGhIjKlMnOp", "c0de_c0de-c0de_c0de", Some("//evil.test")).unwrap();
        assert!(!u.as_str().contains("next="));
    }
    #[test]
    fn only_the_site_loads_in_the_live_window() {
        assert!(on_site(&url::Url::parse("https://vantro-flow-frontend.vercel.app/bridge").unwrap()));
        assert!(!on_site(&url::Url::parse("https://evil.test/").unwrap()));
        assert!(!on_site(&url::Url::parse("http://vantro-flow-frontend.vercel.app/").unwrap()));
        assert!(!on_site(&url::Url::parse("https://vantro-flow-frontend.vercel.app.evil.test/").unwrap()));
    }
    #[test]
    fn keyring_keys_are_allowlisted() {
        assert!(allowed_key("session"));
        assert!(allowed_key("device:tally"));
        assert!(!allowed_key("anything-else"));
    }
}
