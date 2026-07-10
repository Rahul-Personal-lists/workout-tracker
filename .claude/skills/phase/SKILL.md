---
name: phase
description: Use when starting a session in this repo, when a phase's PR is open and the session is wrapping up, or whenever asked to create or update NEXT-SESSION.md.
---

# Phase handoff (NEXT-SESSION.md)

## Overview

`NEXT-SESSION.md` at the repo root is the only memory between sessions: `/phase`
reads it at session start and rewrites it at phase end. One file, always
overwritten — git keeps the history.

## Resume (session start, or invoked as `/phase — resume …`)

1. Read `NEXT-SESSION.md` and `CLAUDE.md`.
2. Verify **State** against reality before trusting it: `gh pr list`, `git log`
   — PRs may have merged (or been reverted) since it was written.
3. Continue from **Next up**, skipping items marked "Rahul," (they're his;
   ask only if they block you).

## Wrap (phase PR open / session ending / asked to update the handoff)

Overwrite `NEXT-SESSION.md` at the repo root with exactly this skeleton, then
commit it on the phase branch so the PR carries it:

```markdown
# Next session — workout-tracker (<today, YYYY-MM-DD>)

## State
<!-- REQUIRED: branch + PR link + open/merged; what shipped (dense bullets);
     verification evidence — and what is explicitly NOT verified yet -->

## Decisions this phase (with the why)
<!-- REQUIRED: each decision + its why, one bullet each. MUST end with a
     "**REJECTED (don't re-pitch):**" bullet — write "none" if none -->

## Next up
<!-- REQUIRED: numbered. Steps only Rahul can do start "**Rahul, <where>:**"
     (phone, dashboard, inbox). Last item = next phase per the roadmap
     (docs/MOBILE_ROADMAP.md here — the mobile track hands off in trainr-mobile/NEXT-SESSION.md instead) -->

## Resume prompt
<!-- REQUIRED: one line, starting exactly:
     /phase — resume workout-tracker from NEXT-SESSION.md: <one-sentence state + what's next> -->
```

Extra sections (porting notes, gotchas) go between **Next up** and **Resume
prompt** when the phase needs them. Match the density of the web repo's
NEXT-SESSION.md — dense bullets, links to PRs/files, no narration.

## Common mistakes

- Resume prompt without the `/phase — ` prefix → next session never re-enters
  this skill. The line is an invocation, not a summary.
- Dropping the REJECTED bullet → settled debates get re-pitched phases later.
- Appending instead of overwriting → stale State above fresh State.
- Writing the file but not committing it on the phase branch → the PR merges
  without its handoff.
