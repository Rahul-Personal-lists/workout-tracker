# Capacitor Android shell + Expo rewrite roadmap — design

**Date:** 2026-07-08
**Branch:** `feat/capacitor-shell`
**Status:** approved by Rahul ("go")

## Context

Rahul wants the workout tracker as a real Android app instead of a PWA. Two deliverables came out of the scoping discussion:

1. A **roadmap doc** for the eventual full rewrite: an Expo (React Native) app in its own repo, same Supabase DB. Sized at ~7 phases / 10–15 PRs. Not built now — planned now.
2. A **Capacitor shell built now**: a native Android APK whose webview loads the deployed Vercel app. Gets the two things the PWA can't reliably do — a first-class home-screen app and real rest-timer notifications while the phone is locked.

## Decisions (Rahul, this session)

- Shell lives in **`mobile/` in this repo** (the future Expo app still gets its own repo).
- **Rest-timer notifications included now** — the small web-side bridge is in scope for this PR.
- **APK built by GitHub Actions** — no Android SDK install on this machine (it has only Java 17). No local APK build expected this session.
- Shell loads the **stable Vercel alias** `https://workout-tracker-rahulpatidar0191s-projects.vercel.app` (the URL Rahul already uses on his phone).
- **Rahul's pre-launch step:** turn **Deployment Protection off for production** in the Vercel dashboard. The alias currently 302s to Vercel SSO, which a fresh webview cannot pass. The app keeps its own OTP auth + RLS.

## Approaches considered

1. **Capacitor shell + remote `server.url`** — CHOSEN. Native bridge is injected into the remote page, so the web app can schedule real local notifications. Sideloadable APK, no store account.
2. TWA / Bubblewrap — REJECTED: no native bridge; notifications would need web-push server infrastructure.
3. Expo + react-native-webview — REJECTED: hand-rolls the bridge Capacitor provides, and muddies the future real-Expo-app repo.

Accepted trade-off: Capacitor's docs frame `server.url` as a live-reload/dev feature and recommend bundling web assets for production. Bundling is impossible here (the app is server-rendered on Vercel), the pattern is widely used for wrapped deployments, and this shell is an explicit stopgap until the Expo rewrite. Consequence: the app is online-only — same as the current PWA, which has shell caching but no offline data.

## Design

### 1. `mobile/` — self-contained Capacitor project

- Own `package.json`: `@capacitor/core` + `@capacitor/cli` + `@capacitor/android` (v8.4), `@capacitor/local-notifications`, `@capacitor/app`, `@capacitor/assets` (dev).
- `capacitor.config.ts`: appId `com.rahul.workouttracker`, appName `Workout Tracker`, `webDir: "www"` (placeholder `index.html` — required field, ignored at runtime because of `server.url`), `server.url` = the stable alias.
- `npx cap add android` scaffolds the committed `android/` Gradle project (no SDK needed to scaffold, only to build).
- Manifest additions: `POST_NOTIFICATIONS` (Android 13+), `SCHEDULE_EXACT_ALARM` + `USE_EXACT_ALARM` (exact delivery matters for a 30–120 s timer).
- Icon: `public/icon-512.png` upscaled to a 1024 px `mobile/assets/logo.png` (using the sharp bundled with capacitor-assets), then `npx @capacitor/assets generate --android`.

### 2. Web bridge — the only touch on the existing app

New client component `src/components/native-shell-bridge.tsx`, mounted with one line in `(app)/layout.tsx`. Renders nothing. **No-ops entirely unless `window.Capacitor?.isNativePlatform?.()`** — browser/PWA behaviour untouched, no new npm deps in the web app (the bridge object is injected by the native shell; a small ambient type covers it).

Inside the shell it:

- **Subscribes to the rest-timer zustand store** (`useRestTimer.subscribe`) — the store itself is not edited. On `endsAt` set/changed with `pausedAt == null` → `LocalNotifications.schedule` one notification (fixed id) at `endsAt` with `allowWhileIdle: true` ("Rest over — back to work", default sound/vibration via a channel created once). On `endsAt → null` or `pausedAt` set → `cancel` that id. Resume reschedules via the same subscription. Natural end in-foreground also hits the cancel path when the timer clears, so the redundant-notification race is ≤ ~1 s and accepted.
- **Requests notification permission lazily** on first schedule (`checkPermissions` → `requestPermissions`, required on Android 13+). Denied permission = silent no-op, timer keeps working visually.
- **Handles Android hardware back** via `@capacitor/app`'s injected `backButton` event: `history.back()` when there's history, else minimize the app.

### 3. CI — `.github/workflows/android-shell.yml`

On pushes/PRs touching `mobile/**` + `workflow_dispatch`: checkout, `setup-java` (Temurin 21 — AGP 8 requirement), npm ci in `mobile/`, `./gradlew assembleDebug` in `mobile/android` (ubuntu runners ship the Android SDK), upload `app-debug.apk` as an artifact. Debug-signed is fine for sideloading; a release keystore is a later nicety.

### 4. Roadmap doc — `docs/MOBILE_ROADMAP.md`

The 7-phase Expo rewrite plan from the scoping session: goals, what carries over (~1,650 lines of pure logic, DB/RLS/auth) vs what's rebuilt (71 client components, 41 server actions as client supabase-js), the shared-invariants decision to make in its phase 2 (duplicate in mobile vs move to Postgres RPCs), per-phase scope + PR counts, distribution (sideload APK, stores later), v1 de-scopes (custom-exercise video stays web). Records this Capacitor shell as phase 0. Moves to the new repo when it exists.

## Verification

- Web gate: `tsc`, lint, build.
- Live preview (test account): an `(app)` page loads with the bridge mounted, zero console errors, rest timer behaves identically in a plain browser.
- CI on the PR builds the APK — that is the shell's build proof this session.
- **Device-bound gaps (Rahul, on his phone):** install the APK from the Actions artifact, first-launch notification permission prompt, timer notification fires with the phone locked, hardware back behaviour.

## Out of scope

- iOS (needs a Mac + Apple account; the Expo rewrite handles it later).
- Release-signed APK / Play Store.
- Notifications for the time-set (cardio) timer — same pattern, follow-up if the rest-timer one proves out.
- Offline behaviour changes.
