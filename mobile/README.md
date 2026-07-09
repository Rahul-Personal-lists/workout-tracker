# Workout Tracker — Android shell (stopgap)

Capacitor 8 shell whose webview loads the deployed web app via `server.url`
(`capacitor.config.json`). `www/` is a required placeholder and is never
shown. Capacitor injects its native bridge into the remote page — the web
app's `NativeShellBridge` component detects it and schedules real rest-timer
notifications (`@capacitor/local-notifications`) and handles hardware back
(`@capacitor/app`). In a plain browser that component no-ops.

- **Build:** CI only — the `Android shell APK` workflow builds
  `app-debug.apk` on `mobile/**` changes; download the artifact and sideload.
  This dev machine has no Android SDK on purpose.
- **Prod URL change?** Edit `server.url` in `capacitor.config.json`, run
  `npm run sync`, commit.
- **Requires:** Vercel Deployment Protection OFF for production, or the
  webview lands on Vercel SSO instead of the app.
- **Lifespan:** stopgap until the Expo rewrite (`docs/MOBILE_ROADMAP.md`).
