# Capacitor Android Shell + Mobile Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Expo-rewrite roadmap doc plus a sideloadable Android APK (Capacitor shell around the deployed Vercel app) with real rest-timer notifications.

**Architecture:** A self-contained Capacitor 8 project in `mobile/` loads the deployed app via `server.url`; the injected native bridge lets one new web-side client component schedule/cancel local notifications by subscribing to the existing rest-timer zustand store (store untouched). CI builds the debug APK; nothing Android is built on this machine.

**Tech Stack:** Capacitor 8.4 (`@capacitor/core|cli|android`), `@capacitor/local-notifications` 8.2, `@capacitor/app` 8.1, `@capacitor/assets` 3.0.5, GitHub Actions (Temurin JDK 21).

**Spec:** `docs/superpowers/specs/2026-07-08-capacitor-shell-design.md`

## Global Constraints

- Shell URL (exact): `https://workout-tracker-rahulpatidar0191s-projects.vercel.app`
- appId `com.rahul.workouttracker`, appName `Workout Tracker`
- Web app: NO new npm dependencies; bridge no-ops unless `window.Capacitor?.isNativePlatform?.()`
- Rest-timer store (`src/lib/stores/rest-timer.ts`) is NOT edited
- Notification: fixed id 4477, channel `rest-timer`, title "Rest over", body "Back to work", `allowWhileIdle: true`
- Commits: conventional prefix style matching the repo (`docs:`, `feat:`, `ci:`), 50/72
- This machine has no Android SDK — never run gradle locally; `npx cap add android` and `npx cap sync` are scaffold-only and fine

---

### Task 1: Expo rewrite roadmap doc

**Files:**
- Create: `docs/MOBILE_ROADMAP.md`

**Interfaces:** none (docs only). Content below is final — written from the approved scoping session.

- [ ] **Step 1: Write `docs/MOBILE_ROADMAP.md`** with exactly this content:

````markdown
# Mobile app roadmap — Expo rewrite

**Written:** 2026-07-08 · **Status:** planned, not started
**Spec/decision record:** docs/superpowers/specs/2026-07-08-capacitor-shell-design.md

The goal: the workout tracker as a real Android app (iOS later), built with
Expo (React Native) in its own repo, against the SAME Supabase project.
The web app stays; the two clients share one DB.

## Phase 0 — Capacitor shell (STOPGAP, shipped from this repo)

- [x] `mobile/` Capacitor shell wrapping the deployed Vercel app: home-screen
      app + real rest-timer notifications. Sideloaded debug APK from CI.
      This buys time; everything below replaces it.

## What carries over vs what gets rebuilt

Carries over untouched:
- Supabase project: schema, RLS, storage buckets, auth (email OTP works
  identically via supabase-js in React Native).
- ~1,650 lines of pure logic: `progression.ts`, `day-order.ts`,
  `starter-program.ts` (21 presets), `reframe.ts`, `media-snapshot.ts`,
  `exercises.ts`. Copy into the new repo (single dev — no shared package
  ceremony until it hurts).

Gets rebuilt (React Native has no RSC and no server actions):
- All ~71 client components in RN primitives (NativeWind for styling).
- The data layer: `queries.ts` + all 41 server actions become client-side
  supabase-js calls + TanStack Query. RLS already authorizes everything.
- Recharts → victory-native. Interactive SVG body map → react-native-svg.

## The shared-invariants decision (make it in Phase 2, not Phase 5)

Some invariants live only inside web server actions today:
- exactly-one-active-program (demote before promote, partial unique index)
- day-order normalization (`applyDayOrder`)
- `planned_*` snapshotting semantics in `set_logs`

With two clients writing one DB, either duplicate them in the mobile repo
(fine for a single user, can drift) or move them into Postgres RPCs both
apps call. Decide when building the mobile data layer.

## Phases

| # | Phase | Scope | PRs |
|---|-------|-------|-----|
| 1 | Scaffold | Expo + TS, 4-tab navigation, Supabase email-OTP auth, theme tokens ported from globals.css | 1 |
| 2 | Data layer | supabase-js queries + TanStack Query, copy pure libs, shared-invariants decision | 1–2 |
| 3 | Workout core | Program hub (day pills, next-up, start/redo, rest-day skip), logging screen, rest timer, pause/finish | 2–3 |
| 4 | Program management | Library (21 presets), day/exercise editing, catalog + body map, blank builder | 2–3 |
| 5 | Progress + history | victory-native charts, month grid, session detail, per-exercise chart | 1–2 |
| 6 | Body + settings | Weight/measurements/photos, profile, units, themes | 1–2 |
| 7 | Native extras + distribution | Rest-timer local notifications (native-grade), haptics, EAS build, sideload APK; Play Store / iOS later or never | 1–3 |

Total: ~10–15 PRs, one phase ≈ one session at the usual cadence. The app is
genuinely usable at the gym after Phase 3.

## v1 de-scopes (decided 2026-07-08)

- Custom-exercise media capture (camera record, crop, trim) stays web-only;
  hardest single feature to port (MediaRecorder/canvas → expo-camera +
  custom crop UI). Mobile app renders existing customs read-only in v1.
- iOS: needs a Mac + Apple dev account (US$99/yr). Android sideload first.
- Offline write queue: same deferral as the web app.

## Distribution

- Android: EAS build → sideloaded APK (no store review). Play Store only if
  ever needed.
- iOS: via the same Expo codebase when wanted.
````

- [ ] **Step 2: Commit**

```bash
git add docs/MOBILE_ROADMAP.md
git commit -m "docs: Expo mobile app rewrite roadmap"
```

---

### Task 2: Pure notification-planning helper + smoke test

**Files:**
- Create: `src/lib/native-shell.ts`
- Create: `scripts/smoke-native-shell.ts`

**Interfaces:**
- Produces: `REST_NOTIFICATION_ID: number` (4477); `planRestNotification(prev: RestSnapshot, next: RestSnapshot, now: number): RestNotificationAction` where `RestSnapshot = { endsAt: number | null; pausedAt: number | null }` and `RestNotificationAction = { type: "schedule"; at: number } | { type: "cancel" } | { type: "none" }`. Task 3 consumes both.

- [ ] **Step 1: Write the failing smoke test** `scripts/smoke-native-shell.ts` (house pattern per `scripts/smoke-day-order.ts` — plain tsx script, non-zero exit on failure):

```ts
import {
  planRestNotification,
  type RestSnapshot,
} from "../src/lib/native-shell";

const NOW = 1_000_000;
const idle: RestSnapshot = { endsAt: null, pausedAt: null };
const active = (endsAt: number): RestSnapshot => ({ endsAt, pausedAt: null });
const paused = (endsAt: number, pausedAt: number): RestSnapshot => ({ endsAt, pausedAt });

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}\n      expected ${e}\n      got      ${a}`);
  }
}

check("start schedules", planRestNotification(idle, active(NOW + 45_000), NOW), { type: "schedule", at: NOW + 45_000 });
check("adjust reschedules", planRestNotification(active(NOW + 45_000), active(NOW + 60_000), NOW), { type: "schedule", at: NOW + 60_000 });
check("stop cancels", planRestNotification(active(NOW + 45_000), idle, NOW), { type: "cancel" });
check("pause cancels", planRestNotification(active(NOW + 45_000), paused(NOW + 45_000, NOW), NOW), { type: "cancel" });
check("resume reschedules", planRestNotification(paused(NOW + 45_000, NOW - 5_000), active(NOW + 50_000), NOW), { type: "schedule", at: NOW + 50_000 });
check("unrelated change is none", planRestNotification(active(NOW + 45_000), active(NOW + 45_000), NOW), { type: "none" });
check("idle to idle is none", planRestNotification(idle, idle, NOW), { type: "none" });
check("past endsAt never schedules", planRestNotification(idle, active(NOW - 1), NOW), { type: "none" });
check("rehydrate catch-up schedules future timer", planRestNotification(idle, active(NOW + 30_000), NOW), { type: "schedule", at: NOW + 30_000 });

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall smoke cases passed");
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx scripts/smoke-native-shell.ts`
Expected: FAIL — cannot find module `../src/lib/native-shell`

- [ ] **Step 3: Implement** `src/lib/native-shell.ts`:

```ts
// Pure decision logic for the native shell's rest-timer notification, kept
// out of the bridge component so it can be smoke-tested without Capacitor.
export const REST_NOTIFICATION_ID = 4477;

export type RestSnapshot = {
  endsAt: number | null;
  pausedAt: number | null;
};

export type RestNotificationAction =
  | { type: "schedule"; at: number }
  | { type: "cancel" }
  | { type: "none" };

export function planRestNotification(
  prev: RestSnapshot,
  next: RestSnapshot,
  now: number
): RestNotificationAction {
  const wasActive = prev.endsAt !== null && prev.pausedAt === null;
  const isActive =
    next.endsAt !== null && next.pausedAt === null && next.endsAt > now;
  if (isActive) {
    if (!wasActive || prev.endsAt !== next.endsAt)
      return { type: "schedule", at: next.endsAt as number };
    return { type: "none" };
  }
  if (wasActive) return { type: "cancel" };
  return { type: "none" };
}
```

- [ ] **Step 4: Run the smoke test, verify all cases pass**

Run: `npx tsx scripts/smoke-native-shell.ts`
Expected: `all smoke cases passed`, exit 0

- [ ] **Step 5: Commit**

```bash
git add src/lib/native-shell.ts scripts/smoke-native-shell.ts
git commit -m "feat: pure planRestNotification helper + smoke test"
```

---

### Task 3: Native shell bridge component + layout mount

**Files:**
- Create: `src/components/native-shell-bridge.tsx`
- Modify: `src/app/(app)/layout.tsx` (import + one mount line)

**Interfaces:**
- Consumes: `planRestNotification`, `REST_NOTIFICATION_ID` from `@/lib/native-shell`; `useRestTimer` from `@/lib/stores/rest-timer` (subscribe/getState only — store not edited).
- Produces: `<NativeShellBridge />` client component rendering null.

- [ ] **Step 1: Write `src/components/native-shell-bridge.tsx`:**

```tsx
"use client";

import { useEffect } from "react";
import { useRestTimer } from "@/lib/stores/rest-timer";
import {
  planRestNotification,
  REST_NOTIFICATION_ID,
  type RestNotificationAction,
} from "@/lib/native-shell";

// Minimal surface of the Capacitor bridge the native shell injects into the
// page (mobile/ loads this app via server.url). No npm dependency on purpose:
// in a plain browser window.Capacitor is undefined and this component no-ops.
type LocalNotificationsPlugin = {
  createChannel(c: { id: string; name: string; importance: number }): Promise<void>;
  checkPermissions(): Promise<{ display: string }>;
  requestPermissions(): Promise<{ display: string }>;
  schedule(o: {
    notifications: Array<{
      id: number;
      title: string;
      body: string;
      channelId: string;
      schedule: { at: Date; allowWhileIdle: boolean };
    }>;
  }): Promise<unknown>;
  cancel(o: { notifications: Array<{ id: number }> }): Promise<void>;
};
type AppPlugin = {
  addListener(
    ev: "backButton",
    cb: (e: { canGoBack: boolean }) => void
  ): Promise<{ remove(): Promise<void> }>;
  minimizeApp(): Promise<void>;
};

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: {
        LocalNotifications?: LocalNotificationsPlugin;
        App?: AppPlugin;
      };
    };
  }
}

export function NativeShellBridge() {
  useEffect(() => {
    const cap = window.Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const notifications = cap.Plugins?.LocalNotifications;
    const app = cap.Plugins?.App;
    if (!notifications) return;

    void notifications
      .createChannel({ id: "rest-timer", name: "Rest timer", importance: 5 })
      .catch(() => {});

    let asked = false;
    const ensurePermission = async () => {
      const { display } = await notifications.checkPermissions();
      if (display === "granted") return true;
      if (asked) return false;
      asked = true;
      return (await notifications.requestPermissions()).display === "granted";
    };

    // A failed notification call must never break the timer itself.
    const apply = async (action: RestNotificationAction) => {
      if (action.type === "none") return;
      try {
        await notifications.cancel({
          notifications: [{ id: REST_NOTIFICATION_ID }],
        });
        if (action.type === "schedule" && (await ensurePermission())) {
          await notifications.schedule({
            notifications: [
              {
                id: REST_NOTIFICATION_ID,
                title: "Rest over",
                body: "Back to work",
                channelId: "rest-timer",
                schedule: { at: new Date(action.at), allowWhileIdle: true },
              },
            ],
          });
        }
      } catch {}
    };

    const unsubscribe = useRestTimer.subscribe((state, prev) => {
      void apply(
        planRestNotification(
          { endsAt: prev.endsAt, pausedAt: prev.pausedAt },
          { endsAt: state.endsAt, pausedAt: state.pausedAt },
          Date.now()
        )
      );
    });
    // Catch up on a timer rehydrated from localStorage before this ran.
    const s = useRestTimer.getState();
    void apply(
      planRestNotification(
        { endsAt: null, pausedAt: null },
        { endsAt: s.endsAt, pausedAt: s.pausedAt },
        Date.now()
      )
    );

    const back = app?.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else void app.minimizeApp();
    });

    return () => {
      unsubscribe();
      void back?.then((h) => h.remove());
    };
  }, []);

  return null;
}
```

- [ ] **Step 2: Mount it in `src/app/(app)/layout.tsx`** — add the import after the `InstallPrompt` import and the element after `<InstallPrompt />`:

```tsx
import { NativeShellBridge } from "@/components/native-shell-bridge";
```

```tsx
      <InstallPrompt />
      <NativeShellBridge />
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/components/native-shell-bridge.tsx "src/app/(app)/layout.tsx"
git commit -m "feat: native shell bridge (rest notifications, back button)"
```

---

### Task 4: Capacitor project in `mobile/`

**Files:**
- Create: `mobile/package.json`, `mobile/capacitor.config.ts`, `mobile/www/index.html`, `mobile/.gitignore`, `mobile/.gitattributes`, `mobile/assets/logo.png` (generated)
- Create (generated by `cap add android`, committed): `mobile/android/**`
- Modify (after generation): `mobile/android/app/src/main/AndroidManifest.xml`

**Interfaces:**
- Consumes: `public/icon-512.png` (existing PWA icon).
- Produces: a gradle project CI can build with `./gradlew assembleDebug` (Task 5 relies on the path `mobile/android`).

- [ ] **Step 1: Write `mobile/package.json`:**

```json
{
  "name": "workout-tracker-shell",
  "version": "0.1.0",
  "private": true,
  "description": "Capacitor Android shell around the deployed workout-tracker web app",
  "scripts": {
    "sync": "cap sync android"
  },
  "dependencies": {
    "@capacitor/android": "^8.4.1",
    "@capacitor/app": "^8.1.0",
    "@capacitor/core": "^8.4.1",
    "@capacitor/local-notifications": "^8.2.0"
  },
  "devDependencies": {
    "@capacitor/assets": "^3.0.5",
    "@capacitor/cli": "^8.4.1"
  }
}
```

- [ ] **Step 2: Write `mobile/capacitor.config.ts`:**

```ts
import type { CapacitorConfig } from "@capacitor/cli";

// server.url makes the webview load the deployed app; www/ is a required
// placeholder that is never shown. Capacitor injects its bridge into the
// remote page, which is what NativeShellBridge in the web app detects.
const config: CapacitorConfig = {
  appId: "com.rahul.workouttracker",
  appName: "Workout Tracker",
  webDir: "www",
  server: {
    url: "https://workout-tracker-rahulpatidar0191s-projects.vercel.app",
  },
};

export default config;
```

- [ ] **Step 3: Write `mobile/www/index.html`** (placeholder required by `webDir`):

```html
<!doctype html>
<meta charset="utf-8" />
<title>Workout Tracker</title>
<p>This shell loads the deployed app via server.url — this file is never shown.</p>
```

- [ ] **Step 4: Write `mobile/.gitignore`:**

```
node_modules/
android/local.properties
```

- [ ] **Step 5: Write `mobile/.gitattributes`** (the gradle wrapper must reach Linux CI with LF):

```
android/gradlew text eol=lf
*.sh text eol=lf
*.bat text eol=crlf
```

- [ ] **Step 6: Install and scaffold android/** (no SDK needed — template copy only):

```bash
cd mobile && npm install && npx cap add android
```

Expected: `android/` created; `npx cap sync android` runs implicitly or run it explicitly after. Verify `mobile/android/gradlew` and `mobile/android/app/src/main/AndroidManifest.xml` exist.

- [ ] **Step 7: Add notification permissions to `mobile/android/app/src/main/AndroidManifest.xml`** — inside `<manifest>`, next to the existing INTERNET permission:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
```

- [ ] **Step 8: Generate the app icon** — upscale the 512px PWA icon to the 1024px source capacitor-assets requires (sharp ships inside @capacitor/assets), then generate (from `mobile/`):

```bash
node -e "require('sharp')('../public/icon-512.png').resize(1024,1024).png().toFile('assets/logo.png').then(()=>console.log('ok'))"
npx @capacitor/assets generate --android --iconBackgroundColor "#0a0a0a" --iconBackgroundColorDark "#0a0a0a" --splashBackgroundColor "#0a0a0a" --splashBackgroundColorDark "#0a0a0a"
npx cap sync android
```

Expected: generated res/ icons + splash inside `mobile/android/app/src/main/res/`; sync copies config. (`#0a0a0a` = `--color-neutral-950`, the app background.)

- [ ] **Step 9: Commit** (android/ template is committed — Capacitor convention; its own generated `.gitignore` excludes build outputs):

```bash
git add mobile
git commit -m "feat: Capacitor Android shell wrapping the deployed app"
```

---

### Task 5: CI workflow building the debug APK

**Files:**
- Create: `.github/workflows/android-shell.yml`

**Interfaces:**
- Consumes: `mobile/android` gradle project from Task 4.
- Produces: artifact `workout-tracker-shell-debug-apk` on every mobile/** change.

- [ ] **Step 1: Check existing workflows for action-version conventions** (`ls .github/workflows/` and match e.g. `actions/checkout` major).

- [ ] **Step 2: Write `.github/workflows/android-shell.yml`:**

```yaml
name: Android shell APK

on:
  push:
    branches: [main]
    paths: ["mobile/**", ".github/workflows/android-shell.yml"]
  pull_request:
    paths: ["mobile/**", ".github/workflows/android-shell.yml"]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
          cache-dependency-path: mobile/package-lock.json
      - run: npm ci
        working-directory: mobile
      - run: npx cap sync android
        working-directory: mobile
      - run: chmod +x gradlew && ./gradlew assembleDebug --no-daemon
        working-directory: mobile/android
      - uses: actions/upload-artifact@v4
        with:
          name: workout-tracker-shell-debug-apk
          path: mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/android-shell.yml
git commit -m "ci: build Android shell debug APK for mobile/ changes"
```

---

### Task 6: Verify

- [ ] **Step 1: Web gate**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: 0 errors (2 pre-existing `progression.ts` lint warnings are known).

- [ ] **Step 2: Smoke test**

Run: `npx tsx scripts/smoke-native-shell.ts`
Expected: all cases pass.

- [ ] **Step 3: Browser no-regression check** — dev server + test account (`claude-test@example.com`, OTP via `npx tsx scripts/test-otp.ts`, cookie flow per CLAUDE.md): load `/program`, confirm zero console errors with the bridge mounted (it must no-op in a plain browser).

- [ ] **Step 4: Push, open PR** (self-assigned, gitmoji title per pr-title-gitmoji-check), watch the `Android shell APK` workflow — a green run + artifact is the shell's build proof.

**Device-bound (Rahul):** flip Vercel Deployment Protection off for production → download APK artifact on phone → install → first-launch permission prompt → timer fires locked. Recorded in NEXT-SESSION.md, not blocking the PR.
