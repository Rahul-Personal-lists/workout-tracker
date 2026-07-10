# Expo rewrite Phase 1 — trainr-mobile scaffold — design

**Date:** 2026-07-10
**Repos:** new **`Rahul-Personal-lists/trainr-mobile`** (private), code on `feat/phase1-scaffold` → PR #1 there. This doc lives in workout-tracker (docs branch), where the roadmap and session log live.
**Status:** approved by Rahul ("looks good")

## Context

Phase 0 (Capacitor shell, #114) is the stopgap. This session starts the real Expo rewrite per [docs/MOBILE_ROADMAP.md](../../MOBILE_ROADMAP.md): **Phase 1 — Scaffold**. New repo, same Supabase project (`stwmtvigdbtmmedevqip`); the web app is untouched. Ends with an app Rahul can open in Expo Go, sign into with the real email OTP, and poke 4 empty tabs.

## Decisions (Rahul, this session)

- **Scope: Phase 1 only** (roadmap cadence: one phase ≈ one session).
- **Repo: `trainr-mobile`**, **private**, local clone at `~/Desktop/work/trainr-mobile`.
- From the roadmap (standing): own repo, same DB, NativeWind, Android-first.

## Device support (verified against Expo docs, 2026-07-10)

- SDK 57: **Android 7+** (minSdk 24, compile/target 36) and **iOS 16.4+**.
- Phase 1 runs inside **Expo Go** (free; latest Play-Store build tracks SDK 57): `npx expo start` → QR scan, phone on the same Wi-Fi (or `--tunnel`). Rahul's phone already runs the shell APK, so it qualifies. An iPhone would work via Expo Go too — no Mac/Apple account until standalone iOS builds (Phase 7+, maybe never).
- The standalone sideloaded APK (Phase 7, EAS) has the same Android 7+ floor and coexists with the shell (`com.rahul.trainr` vs `com.rahul.workouttracker`).

## Approaches considered

1. **`create-expo-app@latest` default template** (SDK 57 ships expo-router + TypeScript wired) — **CHOSEN**. SDK 57 is newer than Claude's training data; the template generates version-correct babel/metro/tsconfig, exactly the wiring memory would botch. Strip example screens, add NativeWind + supabase-js + tokens.
2. Blank TS template + hand-wire expo-router — REJECTED: more control, no payoff, higher risk against an unseen SDK.
3. Community starters (create-expo-stack, obytes, Ignite) — REJECTED: kitchen-sink opinions (i18n, test rigs) against the "stay terse" ethos; unknown SDK-57 currency.

## Design

### 1. Repo & workflow

- `gh repo create Rahul-Personal-lists/trainr-mobile --private`; first commit on `main` = pristine template output so PR #1's diff is only our changes.
- Thin `CLAUDE.md`: stack, conventions, **"same Supabase DB as workout-tracker — write-invariants (one-active-program, day-order, planned_* snapshotting) still live in web server actions; auth is Phase 1's only write"**, pointer to the roadmap. Plus `.env.example` and a `.gitignore` covering `.env*`.
- Package manager: npm (parity with the web repo).

### 2. App identity

Name **Trainr**, slug `trainr-mobile`, scheme `trainr://`, Android package `com.rahul.trainr`, dark-only (`userInterfaceStyle: "dark"`), portrait, black splash/background; icon = web repo's kettlebell `icon-512.png` (adaptive icon from the same art; regenerate properly in Phase 7).

### 3. Structure (expo-router)

```
app/
├── _layout.tsx          root: session provider + redirect (auth ⇄ tabs)
├── (auth)/login.tsx     email → 6-digit OTP, ported web UX
└── (tabs)/
    ├── _layout.tsx      Tabs: Program / Progress / Body / Settings (lucide-react-native)
    ├── index.tsx        Program — branded placeholder ("arrives Phase 3")
    ├── progress.tsx     placeholder (Phase 5)
    ├── body.tsx         placeholder (Phase 6)
    └── settings.tsx     signed-in email + working Sign out
lib/supabase.ts          createClient: AsyncStorage persistence, AppState auto-refresh
theme/tokens.ts          single source of ported design tokens
```

Tab styling mirrors the web bottom nav: accent text + top indicator on the active tab, muted otherwise, same icon set (Dumbbell / LineChart / Scale / Settings).

### 4. Auth

- supabase-js v2 with `@react-native-async-storage/async-storage` storage, `persistSession: true`, `detectSessionInUrl: false` — the documented RN pattern. SecureStore rejected for now: 2 KB value limit needs an AES wrapper (YAGNI on a personal device; revisit Phase 7).
- Same two-step flow as web `login/page.tsx`: `signInWithOtp({ email, options: { shouldCreateUser: false } })` → `verifyOtp({ email, token, type: "email" })`. Code entry, so no deep-link handling needed.
- `AppState`-driven `startAutoRefresh()/stopAutoRefresh()` so tokens refresh while foregrounded.
- Root layout gates on `getSession()` + `onAuthStateChange` → `<Redirect>`; Settings tab has Sign out.

### 5. Theming

`theme/tokens.ts` carries the exact values from `globals.css` (closest sRGB hex to the web's oklch neutrals — indistinguishable on a phone):

| token | value |
|---|---|
| background | `#0a0a0a` (neutral-950) |
| surface / hover / subtle | `#171717` / `rgba(23,23,23,0.7)` / `rgba(23,23,23,0.4)` |
| border / strong | `#262626` / `#404040` |
| foreground / muted | `#ffffff` / `#a3a3a3` |
| accent / accent-foreground | `#a3e635` (lime, default) / `#000000` |
| alt accents (Phase 6 switcher) | sky `#38bdf8` · amber `#fbbf24` · violet `#a78bfa` · rose `#fb7185` |
| goal colors | orange `#fb923c` · teal `#2dd4bf` · rose `#fb7185` |

NativeWind 4.2.x (+ tailwindcss 3.4.x as its docs require — **not** Tailwind v4 syntax; that's a web-repo-only convention) maps these to the same semantic class names as the web app: `bg-surface`, `border-border`, `text-foreground-muted`, `text-accent`. System font for Phase 1; Geist is Phase 6 polish.

### 6. Env & CI

- `.env` (gitignored): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` — same values as the web repo's `.env`.
- `.github/workflows/check.yml`: npm ci + `tsc --noEmit` + `expo lint` on PRs/pushes. No build CI until Phase 7 (EAS).

## Verification

- Gates: `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`.
- **Claude, end-to-end on the web target:** `expo start --web` in the preview browser → sign in as `claude-test@example.com` with an OTP minted by the web repo's `scripts/test-otp.ts` (same Supabase project, no email sent) → 4 tabs render, Settings shows the email, Sign out returns to login.
- **Rahul, native:** Expo Go QR → real OTP sign-in on the phone → session survives an app kill/relaunch (AsyncStorage persistence proof).
- Honest gap: the web target proves logic/navigation, not native pixels — the visual pass is Rahul's Expo Go look.

## Risks

- **SDK 57 postdates Claude's knowledge** → template output + live docs (docs.expo.dev, supabase.com/docs RN guide) are authoritative over memory; expo-doctor gates the dep matrix.
- **NativeWind 4.2 vs SDK 57**: if they fight, fallback is plain `StyleSheet` fed by the same `tokens.ts` — the tokens file is the stable interface either way.
- **Expo Go tracks only the latest SDK**: scaffold with whatever `create-expo-app@latest` emits (it always matches current Expo Go), even if that's already SDK 58 by install time.

## Out of scope (later phases)

- Data layer: queries, TanStack Query, pure-lib copying, shared-invariants decision → Phase 2.
- Workout logging, rest timer → Phase 3. Program management/library → Phase 4. Charts/history → Phase 5.
- Body/settings screens, accent switcher, Geist font → Phase 6.
- Notifications, haptics, EAS builds, APK distribution → Phase 7. Custom-exercise media stays web-only in v1.
- No offline queue (same deferral as web). Web app: zero changes this session.
