# Starlane for iPhone and Android

This is the phone app: an Expo SDK 57 project using Expo Router. It is built for the owner's day away from the desk:

Tabs follow Starlane's seven features:

- **Bridge.** What the company is owed and how much is overdue (by band), what needs a decision, what Watch noticed, missions and what is coming — with how current the books are.
- **Watch.** Events raised once with their evidence and closed when they stop being true; urgent ones arrive as a push. Notifications live here too.
- **Scan.** Look into a customer or invoice (every fact labelled), or ask in words. Read-only: the server gives phone sessions look-up tools only.
- **Missions.** Everything waiting for a decision, and collections missions with progress measured from the books. Start, pause or cancel a mission here.
  - A **high-risk approval needs Face ID, a fingerprint or the device passcode**; the server refuses one that isn't confirmed.
- **More.** Simulate, Memory and Prepared, then Sources (read-only) and Settings (signed-in devices, push status, sign out).
- **Push.** Tapping a notification opens the exact screen (`src/lib/routes.ts`).

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
| iPhone, installable build | `npx eas-cli build -p ios --profile preview` (internal distribution, profiles in `eas.json`), or `--profile production` then `npx eas-cli submit -p ios` for TestFlight | See **iPhone: what Apple needs** below. |

## Push notifications

The app registers an Expo push token, and the backend (`lib/notifications/notify.js`) sends notifications through Expo's push service. A build needs two things for this to work:

1. **An EAS project id:** `npx eas-cli init` writes it into `app.json` under `extra.eas.projectId`. This needs an Expo account.
2. **Platform credentials:**
   - **Android:** FCM (`google-services.json` from a Firebase project). Remote push does not work in Expo Go on Android.
   - **iOS:** an APNs key, which needs an Apple Developer account.

Without them, Settings says exactly why push is off; Watch and Missions still show everything in the app.

## CI

`.github/workflows/mobile.yml`:

- Every change runs a typecheck and builds the native JS bundles for iOS and Android.
- Every push also produces an installable APK.

The workflow signs the APK with the release key if these secrets are set: `ANDROID_KEYSTORE` (base64 .jks), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`.

## iPhone: what Apple needs

The app is configured for iOS (`app.json`: bundle id `app.starlane.mobile`, Face ID usage text, `ITSAppUsesNonExemptEncryption: false`; `eas.json`: preview and production profiles). What only the account owner can provide:

1. **Apple Developer Program** membership for the company (US$99 a year), enrolled as an organization (needs a D-U-N-S number).
2. **An Expo account**, then `npx eas-cli init` once to link the project (writes `extra.eas.projectId`).
3. **First build:** `npx eas-cli build -p ios --profile preview`. EAS asks to sign in to Apple and creates the distribution certificate and provisioning profile. Register test iPhones with `npx eas-cli device:create` for internal builds.
4. **Push:** let EAS create the APNs key during the build (or upload one).
5. **TestFlight / App Store:** `npx eas-cli build -p ios --profile production` then `npx eas-cli submit -p ios`. The App Store listing needs a privacy policy URL (`/privacy` on the site), screenshots and the App Privacy answers (no tracking; account email and business data only).

## Not in this app (on purpose)

- **Connecting Tally.** That happens on the computer that runs TallyPrime, in Starlane for desktop.
