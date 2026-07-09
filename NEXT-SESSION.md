# Next session — workout-tracker (2026-07-08)

## State

- Branch `feat/capacitor-shell`, PR [#114](https://github.com/Rahul-Personal-lists/workout-tracker/pull/114) open, self-assigned, awaiting Rahul's merge.
- Shipped: `docs/MOBILE_ROADMAP.md` (7-phase Expo rewrite plan), `mobile/` Capacitor 8 shell (webview → stable Vercel alias), web-side `NativeShellBridge` (rest-timer local notifications + hardware back, no-ops in plain browsers), CI workflow `Android shell APK` building the debug APK artifact.
- Verified: tsc/lint/build green, smoke 9/9, live preview `/program` zero console errors, bridge wiring proven with a stubbed Capacitor bridge (`createChannel` → `cancel(4477)` → `schedule(4477, endsAt)` exact). APK build proof = the workflow run on the PR.

## Decisions this phase (with the why)

- **Capacitor shell over TWA/Bubblewrap** — TWA has no native bridge; notifications would need web-push infra. REJECTED TWA.
- **Over Expo+react-native-webview** — hand-rolls what Capacitor gives free; muddies the future real Expo repo. REJECTED.
- **Shell lives in `mobile/` in this repo**; the Expo rewrite gets its own repo (Rahul's call).
- **`capacitor.config.json` not `.ts`** — Capacitor CLI needs a `typescript` dep to parse TS configs; JSON avoids the dep entirely.
- **Debug APK from CI only** — no Android SDK on this machine (Rahul: don't install; GitHub Actions builds).
- **`server.url` official caveat accepted** — Capacitor docs call it a dev feature; bundling is impossible for a server-rendered app, and this is an explicit stopgap.
- **Custom-exercise media stays web-only in mobile v1**; iOS deferred (needs Mac + Apple account).

## Next up

1. **Rahul, device-bound:** flip Vercel Deployment Protection OFF for production (alias currently 302s to Vercel SSO — webview can't pass), download the `workout-tracker-shell-debug-apk` artifact from the PR's workflow run, install, start a rest timer, accept the permission prompt, verify it fires with the phone locked. Also check hardware-back behaviour.
2. Then: merge #114.
3. When ready for the real app: Expo rewrite Phase 1 (scaffold) per `docs/MOBILE_ROADMAP.md`, in a NEW repo.

## Resume prompt

/phase — resume workout-tracker from NEXT-SESSION.md: Capacitor shell PR #114 shipped; if merged and device-verified, start Expo rewrite Phase 1 (new repo scaffold) per docs/MOBILE_ROADMAP.md.
