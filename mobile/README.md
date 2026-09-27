# Starlane for iPhone and Android

This is the phone app: an Expo SDK 57 project using Expo Router. It is built for the owner's day away from the desk:

- **Today.** The same "Now" sentence the desktop shows, built from real data. Below it: what needs a decision, receivables, what changed, and source health.
- **Approvals.** Every action shows its evidence, with each fact labelled observed, calculated or assumption.
  - A **high-risk approval needs Face ID, a fingerprint or the device passcode**.
  - The server enforces this independently: it refuses a high-risk approval that isn't confirmed.
- **Discover.** Signals and opportunities.
- **Ask Starlane.** Answers questions from the company's own records. It is read-only; the server gives phone sessions look-up tools only.
- **More.** Inbox, Watch, Sources (read-only) and Settings (signed-in devices with remote sign-out, push status, sign out).
- **Push.** The same notification records as the desktop Inbox. Tapping one opens the exact screen.

The session lives in the iOS Keychain or Android Keystore (`expo-secure-store`, this device only, readable after unlock). Nothing is written to AsyncStorage or to files. Last-loaded data stays on screen marked "Offline · as of HH:MM".

The app shares `packages/contracts` (API client, types, formatting, design tokens) with the desktop app.

## Run it

```bash
cd mobile
npm install
npx expo start            # scan the QR code with Expo Go (iPhone: Camera app; Android: Expo Go app)
```

`EXPO_PUBLIC_STARLANE_API_URL` points the app at a different backend. The default is production.

## Fastest way onto a phone

| Phone | Fastest path | What it needs |
|---|---|---|
| **Android** | Download the APK from the latest **Mobile** workflow run (artifact `starlane-android-<sha>`). Open it on the phone and allow "install unknown apps". | Nothing. It is debug-signed unless the release keystore secrets are set. |
| **iPhone** | Install **Expo Go** from the App Store, then run `npx expo start` on a computer on the same Wi-Fi and scan the QR code with the Camera app. | A computer with Node 22. Everything runs except push notifications. |
| iPhone, installable build | `npx eas-cli build -p ios --profile preview`, then TestFlight | An Apple Developer account ($99/yr) and an Expo account. |

## Push notifications

The app registers an Expo push token, and the backend (`lib/notifications/notify.js`) sends notifications through Expo's push service. A build needs two things for this to work:

1. **An EAS project id:** `npx eas-cli init` writes it into `app.json` under `extra.eas.projectId`. This needs an Expo account.
2. **Platform credentials:**
   - **Android:** FCM (`google-services.json` from a Firebase project). Remote push does not work in Expo Go on Android.
   - **iOS:** an APNs key, which needs an Apple Developer account.

Without them, Settings says exactly why push is off, and approvals still appear in Today and the Inbox.

## CI

`.github/workflows/mobile.yml`:

- Every change runs a typecheck and builds the native JS bundles for iOS and Android.
- Every push also produces an installable APK.

The workflow signs the APK with the release key if these secrets are set: `ANDROID_KEYSTORE` (base64 .jks), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`.

## Not in this app (on purpose)

- **Connecting Tally.** That happens on the computer that runs TallyPrime, in Starlane for desktop.
- **Missions.** The backend has no mission entity yet (see `app/missions/page.tsx` on the web), so the app doesn't pretend to have one.
