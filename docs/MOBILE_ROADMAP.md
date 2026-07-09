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
