# Next session — workout-tracker (2026-07-08)

## State

- `feat/capacitor-shell` **merged** (#114). Branch `feat/startup-speed`, PR [#115](https://github.com/Rahul-Personal-lists/workout-tracker/pull/115) open, self-assigned, awaiting Rahul's merge.
- Shipped: `staleTimes {dynamic:30, static:300}` client router cache; query-waterfall collapse (`/program` ~6→~3 roundtrips, `/workout`, `/progress`); 7 new `loading.tsx` skeletons (history ×2, library ×3, exercises ×2); `NavPending` tap feedback (day pills / range tabs / month grid); signed-URL memo [src/lib/signed-url-cache.ts](src/lib/signed-url-cache.ts) (+ smoke, 10 cases); lazy Recharts ×3; preconnects to image/media origins.
- Verified: tsc/lint/build green, smokes 10/10 + 6/6 + 9/9, live before/after on local prod servers (test account, Playwright): `/program` load median 950→490 ms, day-pill re-hop within 30 s 544→66–82 ms, history-tap skeleton at 131 ms (was a frozen screen). Zero console errors.

## Decisions this phase (with the why)

- **staleTimes 30 s for dynamic pages** — pill/tab re-visits serve from client cache; the app's own mutations stay fresh (`revalidatePath` busts it). Cross-device staleness ≤30 s accepted (single user). Experimental config, one-line revert.
- **Reap joined `/program` wave 1** — it touches only `workout_sessions`/`set_logs`; the session-reading wave 2 must stay after it (comment in page.tsx guards this).
- **`signCustomVideoUrl` stays uncached** — its whole job is a fresh URL after a mid-session 403.
- **Photo signing failures degrade to empty URLs** instead of throwing (matches `getFavoriteSlugs` resilience).
- **REJECTED (don't re-pitch):** Cache Components/PPR (modest gain on 100 % per-user data; Expo rewrite supersedes), SW HTML caching (stale-chunk 404 hazard `public/sw.js` documents), TanStack Query (still no use case), theme-cookie restructure (only pays off under PPR).

## Next up

1. **Rahul, Vercel dashboard:** Fluid Compute ON (cold starts); function region = default `iad1` (Supabase is us-east-1); **Deployment Protection OFF** for prod (also still owed for #114's APK).
2. **Rahul, device:** sideload the `workout-tracker-shell-debug-apk` artifact (#114), rest-timer locked-phone + hardware-back test; after #115 merges, feel the speed difference on the phone.
3. Merge #115.
4. Optional cleanup: empty test session `004e295b` (today, claude-test account, created for the history-tap measurement; my delete was permission-blocked) — remove via its /history page if unwanted.
5. Then: Expo rewrite Phase 1 (new repo scaffold) per [docs/MOBILE_ROADMAP.md](docs/MOBILE_ROADMAP.md).

## Resume prompt

/phase — resume workout-tracker from NEXT-SESSION.md: startup-speed PR #115 shipped and awaiting merge + Rahul's Vercel dashboard checklist (Fluid Compute, region, Deployment Protection). If #115 is merged and device-verified, next is Expo rewrite Phase 1 (new repo scaffold) per docs/MOBILE_ROADMAP.md.
