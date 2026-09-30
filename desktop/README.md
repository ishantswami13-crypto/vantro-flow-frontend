# Starlane for desktop

This is the native Starlane app for Windows; macOS builds come later. It is a Tauri 2 shell (`src-tauri/`) around a purpose-built React interface (`src/`), and it runs the local Tally connector host. The design decisions are in `docs/client-platform/ADR-001-desktop-tauri.md`.

## What it does

- **Sign in.** Uses native sessions stored in the OS credential store, and can sign out any other device (Settings).
- **First run.** Walks through organization, systems, then Connect Tally (it detects TallyPrime on port 9000 and lists the open companies), then the first sync.
- **Now.** One sentence from real data, then:
  - what needs a decision;
  - what changed;
  - receivables;
  - source health.
- **Decisions.** Each action shows its evidence, with every fact labelled observed, calculated or assumption. High-risk approvals need a second, explicit confirmation, and the server enforces it too.
- **Sources.** The live connector catalog, plus this computer's Tally host: last run, next run, company, sync now, disconnect, and revoke other bridges.
- **Watch, Discover, Simulate, and Ask Starlane.** Ask Starlane is read-only in the apps.
- **Inbox, with native notifications** for new approvals, results and connector problems.
- **Background.** Closing the window keeps it in the tray, and "Sync now" is also in the tray. It can start at login in the background, and `starlane://actions/<id>` deep links open the exact item.
- **Updates.** Stable and beta channels, signature-verified.

## Develop

```bash
cd desktop
npm install
npm run dev                 # interface only, in a browser (secrets in memory, no Tally host)
npx tauri dev               # the real app (needs Rust; on Linux: libwebkit2gtk-4.1-dev)
npm run build               # typecheck + production web build
cargo test --manifest-path src-tauri/Cargo.toml
```

`VITE_STARLANE_API_URL` points the app at another backend. The default is production. The app's HTTP capability only allows `*.up.railway.app`, `*.starlane.app` and `localhost:8787`.

### End-to-end in a browser preview (no production data)

```bash
# backend: PORT=8787 ALLOWED_ORIGINS=http://localhost:1420 DATABASE_URL=<test db> node server.js
node scripts/fake-tally.mjs ../../vantro-flow-backend      # stand-in for TallyPrime
VITE_STARLANE_API_URL=http://localhost:8787 npx vite --port 1420
npm run e2e:preview                                         # see the script header for the test account
```

## Build an installer

CI builds it (`.github/workflows/desktop.yml`, job `windows`) on every push that touches `desktop/` or `packages/contracts/`:

- The `.exe` (NSIS, per-user install, no admin rights) and the `.msi` are attached to the workflow run as `starlane-windows-<sha>`.
- A tag `desktop-vX.Y.Z` publishes a draft GitHub Release.

To build locally on Windows: `npm ci && npx tauri build --bundles nsis,msi`.

### Signing (set up by the repository owner)

| What | Where | Without it |
|---|---|---|
| Updater keypair (`npx tauri signer generate`) | secret `TAURI_SIGNING_PRIVATE_KEY` (+ `_PASSWORD`), variable `TAURI_UPDATER_PUBKEY` | The app cannot update itself; Settings says so. |
| Windows code-signing certificate (.pfx, base64) | secrets `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD` | SmartScreen shows "Windows protected your PC / unknown publisher" (More info › Run anyway). |
| Apple Developer ID + notarization | not wired yet | No macOS build is offered. |

`scripts/configure-release.mjs` applies whichever of these are present at build time. Nothing about the keys is committed.
