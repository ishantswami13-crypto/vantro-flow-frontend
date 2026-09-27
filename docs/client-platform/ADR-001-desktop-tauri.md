# ADR-001: Starlane desktop is a Tauri 2 app with its own interface and an embedded Tally connector host

Status: accepted · 2026-09-27

## Context

Starlane's first data source for Indian MSMEs is TallyPrime. TallyPrime runs on the owner's or accountant's Windows PC and exposes data only through its local HTTP server on port 9000. The cloud cannot reach it. Until now that gap was closed by a command-line bridge (`vantro-flow-backend/tally-connector/tally-sync.mjs`). The bridge works, but a business owner won't install and schedule a Node script.

The product needs a desktop app that meets three requirements:

1. **Runs on the Tally PC.** It must read Tally locally, keep syncing while its window is closed, and start at login.
2. **Holds credentials safely.** Credentials go in the OS credential store: never in a file, never in `localStorage`.
3. **Is Starlane itself, not the website in a frame.** Now, decisions with evidence, sources and settings are built for a window, not a browser tab.

## Decision

- **Shell: Tauri 2 (Rust), in `desktop/src-tauri`.**
  - Installer size: roughly 5–10 MB, against more than 80 MB for Electron.
  - It uses the OS web view (WebView2 on Windows, WKWebView on macOS).
  - Plugins cover everything we need: native HTTP, notifications, autostart, deep links, single instance, and a signature-verified updater.
  - The Rust side stays deliberately small:
    - secret storage through `keyring`, limited to three allowlisted keys;
    - the tray and background mode;
    - deep-link routing;
    - update check and install;
    - app info.
- **Interface: React + Vite, in `desktop/src`.**
  - It is purpose-built. It does not reuse the Next.js pages.
  - It sits on `packages/contracts`: the same typed API client, formatting and design tokens that the mobile app uses.
- **Auth: native sessions.**
  - The backend `/api/auth/native/*` endpoints issue a 15-minute access token and a rotating refresh token. Reuse of a refresh token revokes the whole session.
  - The session lives in Windows Credential Manager or the macOS Keychain.
  - Settings lists every signed-in device, and any of them can be signed out immediately.
- **Tally: the connector host lives inside the app** (`desktop/src/connector/tallyHost.ts`).
  - It keeps the bridge's wire protocol and device-credential model, and uses a TypeScript port of the bridge parser. The port is parity-tested against the CLI (`packages/contracts/scripts/tally-parity.mjs`).
  - **Pairing:**
    1. The signed-in owner asks for a one-time code.
    2. The app claims it immediately.
    3. The device secret goes to the keyring.
    4. The app exchanges the secret for 15-minute device tokens.
  - **Sync:**
    - Runs every 15 minutes.
    - Backs off (1, 2, 4… minutes) after a failure.
    - Keeps running from the tray, and "Sync now" is in the tray menu.
    - Every attempt is recorded as a sync run on the server, so health is never guessed.
  - **Offline recovery:**
    - The import is idempotent, so the next good run re-sends the financial-year window.
    - No financial records are queued on disk.
- **The CLI bridge stays.** It keeps working for servers or headless PCs, with the same device model. We are not throwing away a working connection path.
- **Distribution:**
  - GitHub Actions (`.github/workflows/desktop.yml`) builds the NSIS `.exe` and the `.msi` on `windows-latest`.
    - Every build is kept as a workflow artifact.
    - A `desktop-v*` tag publishes a draft GitHub Release.
  - Updates are downloaded from GitHub Releases (`latest.json`). The stable or beta channel is chosen at runtime.
  - The updater plugin verifies each update against the public key embedded at build time.
    - A build without the key cannot update itself, and says so in the app.
    - Nothing is ever fetched and executed outside that signed path.

## Consequences

- **Signing needs the owner:**
  - the updater keypair: `npx tauri signer generate`, then the secret and the variable in the repo settings;
  - a Windows Authenticode certificate, in the repo secrets.
  - Without the certificate, Windows SmartScreen shows "unknown publisher". Nothing else breaks.
- **macOS builds** (`app`/`dmg`) need a Mac runner, plus an Apple Developer ID and notarization to run without warnings. That is not in CI yet.
- **Transport:**
  - The web view never makes cross-origin browser requests to the API; all HTTP goes through the native client.
  - The capability file (`src-tauri/capabilities/default.json`) restricts that client to the Starlane API hosts and local Tally on port 9000.
  - The backend accepts the Tauri origins without credentials.
- **Offline behaviour:** a screen keeps the last good answer in memory and labels it "Offline · as of HH:MM". Nothing is presented as live when it is not.
