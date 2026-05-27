# Session log

(latest first; only the most recent 3 sessions are kept)

## 2026-05-27 — Drag handles + remove pause concept

- Shipped `d6224d5`: exercise rows on `/program` and active workout cards now reorder via a GripVertical drag handle (dnd-kit) with swipe-to-delete; old 3-dots overflow menu deleted.
- Same commit removed the pause feature — bottom nav is visible on `/workout/*`, `pauseSession`/`resumeSession` and `PausedWorkoutBanner` are gone, `/today` shows a "Resume" card for open sessions instead of redirecting.
- DB columns `paused_at` / `total_paused_seconds` left in place (no migration); nothing writes to them anymore.
- Created the `/log-session` skill itself at `~/.claude/skills/log-session/SKILL.md`.
- Verification of the drag-handle UI in the preview browser was blocked all session — headless browser stuck on `chrome-error://` with origin `null` after a Supabase DNS-timeout cycle and never recovered. Code typechecks; user is testing manually.
