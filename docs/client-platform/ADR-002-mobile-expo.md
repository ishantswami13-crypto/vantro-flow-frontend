# ADR-002: Starlane mobile is an Expo (React Native) app on the shared contracts

Status: accepted · 2026-09-27

## Context

Owners decide away from the desk. The phone has to cover four jobs:

- show what needs them today;
- let them approve or decline, with the evidence in view and a stronger check on high-risk actions;
- notify them when something needs attention;
- answer questions from the company's own records.

It has to reach iPhone and Android quickly, from a small team, without a second codebase.

## Decision

- **Expo SDK 57 with Expo Router**, in `mobile/`. One TypeScript codebase serves iOS and Android.
  - It uses the same `packages/contracts` API client, types, formatting and design tokens as the desktop app.
  - Metro resolves `@starlane/contracts` from `../packages/contracts` (`metro.config.js`), so there is no package to publish.
- **Secrets:** `expo-secure-store` holds the session, with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`: iOS Keychain, Android Keystore-backed storage. Nothing goes into AsyncStorage.
- **High-risk approvals:**
  - `expo-local-authentication` requires biometrics or the device passcode before the app sends `confirmHighRisk: true`.
  - The server returns 428 without that flag. The phone's check therefore adds to the server rule and never replaces it.
- **Push:** Expo push tokens (`POST /api/client/push-devices`). The backend fans canonical `notification_events` out to them, and each notification's `route` opens the exact screen.
- **Ask Starlane:** uses the existing assistant endpoint. Native sessions only get read-only tools there, and the server enforces that.
- **Distribution:**
  - CI builds an Android APK on every push. It uses the release key if one is configured in secrets, and the debug key otherwise, for internal testing only.
  - iPhone: Expo Go for immediate testing, and EAS Build → TestFlight once an Apple Developer account exists.

## Consequences

- **Push needs accounts:**
  - an Expo account (EAS project id);
  - Firebase (FCM) for Android;
  - an Apple Developer account for APNs.
  Until they exist, the app says push is off and why, and everything else works.
- **Expo Go runs this app as-is:** every module used ships inside Expo Go SDK 57. That makes Expo Go the fastest iPhone path, with no Apple account needed.
- **Missions is not built.** The backend has no mission entity (see the audit in the web app's `app/missions/page.tsx`), so no screen pretends there is one.
