# /today — design + accessibility review

**Reviewer:** Claude (design plugin: accessibility-review, design-critique, ux-copy, design-system, design-handoff)
**Date:** 2026-04-30
**Standard:** WCAG 2.1 AA
**Method:** static source review of `src/app/(app)/today/page.tsx` + `src/components/bottom-nav.tsx` + `src/app/globals.css` + `src/app/layout.tsx` + `src/app/(app)/layout.tsx`. Dev server boot confirmed (Next 16.2.4 Turbopack, ready in 268ms); auth gating prevented authenticated-screen capture inside the sandbox, so contrast and touch-target measurements are taken from the exact hex/dimension values in source rather than rendered pixels.

---

## TL;DR

| Severity | Count | Headline |
|---|---|---|
| Critical | 2 | `userScalable: false` blocks zoom; no `:focus-visible` styles on any button utility |
| Major | 4 | Sub-text on neutral-900 cards fails 4.5:1; `aria-current` missing on bottom nav; heading order h2→h1; nav landmarks unlabeled |
| Minor | 5 | 🎉 emoji needs aria treatment; greeting hierarchy semantics; hardcoded hex in `globals.css`; bottom-nav active state leans on color alone; `Set up days` CTA height = 44 (exact minimum) |

The screen is well-built — clear hierarchy, generous CTA, smart empty states, thoughtful copy. The accessibility issues are concentrated in two places: viewport/zoom config and missing focus styling. Both are global, not /today-specific, but they show up here.

---

## 1. Accessibility audit (WCAG 2.1 AA)

### Perceivable

| # | Issue | WCAG | Severity | Recommendation |
|---|---|---|---|---|
| P1 | `userScalable: false` + `maximumScale: 1` in [src/app/layout.tsx:35-36](../src/app/layout.tsx) blocks pinch-zoom. Documented WCAG failure for low-vision users on Android (iOS now ignores it but Android still respects it). | 1.4.4 Resize text | Critical | Remove `maximumScale` and `userScalable`. Loss of pinch-zoom is not worth the marginal "feels like a native app" gain — a PWA that lets users zoom is more native than one that doesn't. |
| P2 | Exercise progression hint `text-[11px] text-neutral-500` rendered on `bg-neutral-900` card ([today/page.tsx:190](../src/app/(app)/today/page.tsx)). `#737373` on `#171717` = **4.16:1** — fails 4.5:1 for normal text. | 1.4.3 Contrast | Major | Bump to `text-neutral-400` (`#a3a3a3` on `#171717` = **7.6:1**) — also matches the sets/reps meta text on the same card, which is already neutral-400. |
| P3 | Body greeting `text-sm text-neutral-400` motivation line on black: `#a3a3a3` on `#000` = **8.5:1** — passes. No fix. | 1.4.3 | — | OK |
| P4 | Phase/week meta `text-xs uppercase tracking-wide text-neutral-500` on black: `#737373` on `#000` = **4.68:1** — passes by a hair. Fine on a true black OLED but borderline if the OS applies any glare reduction. | 1.4.3 | Minor | Consider neutral-400 for safety; current value is technically compliant. |
| P5 | Bottom-nav inactive labels `text-neutral-500` on `bg-black/95`: ~4.6:1 — passes. Active state uses `text-accent` (lime `#a3e635` = 15.7:1). | 1.4.3 | — | OK |
| P6 | Bottom-nav active state is signaled by **color + stroke-width 2.25 vs 1.75**. Stroke change is subtle; on a small phone in sunlight the difference is hard to read. Color alone would fail 1.4.1. | 1.4.1 Use of color | Minor | Add a small accent dot or top-border under the active tab so the state isn't dependent on hue. |
| P7 | 🎉 emoji in the "all weeks complete" state ([today/page.tsx:116](../src/app/(app)/today/page.tsx)) is announced by VoiceOver as "party popper". Decorative, not informational. | 1.1.1 Non-text content | Minor | Wrap in `<span aria-hidden="true">🎉</span>` or use a Lucide icon (e.g. `PartyPopper`). |

### Operable

| # | Issue | WCAG | Severity | Recommendation |
|---|---|---|---|---|
| O1 | No `:focus-visible` styles on `btn-primary`, `btn-secondary`, `btn-ghost-add`, or bottom-nav `<Link>` ([globals.css:61-97](../src/app/globals.css), [bottom-nav.tsx:30-39](../src/components/bottom-nav.tsx)). The browser default ring is barely visible on `bg-accent` and on dark surfaces. Keyboard users (and external-keyboard tablet users) lose orientation. | 2.4.7 Focus visible | Critical | Add `&:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }` to the three button utilities. For bottom-nav links, use `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black`. |
| O2 | "Set up days" / "Pick a program" empty-state CTA is `h-11` = **44px exact** ([today/page.tsx:78,95](../src/app/(app)/today/page.tsx)). Hits the floor of WCAG 2.5.5 but leaves no margin for fat-finger error. | 2.5.5 Target size | Minor | Bump to `h-12` (48px) — matches the "View calendar" button in the completed state and the Apple HIG baseline. |
| O3 | Start workout button is `h-14` (56px) — exceeds target size, easy to hit. | 2.5.5 | — | OK |
| O4 | Bottom-nav link is the full grid cell (~89.6 × 64px on a 28rem container). Generous. | 2.5.5 | — | OK |
| O5 | Tab order on /today: greeting (skip) → empty-state CTA OR exercise list (skip, non-interactive) → Start workout → bottom nav (5 tabs). Logical. | 2.4.3 Focus order | — | OK |
| O6 | No skip-to-main-content link. The bottom nav is reached *after* main content, so this is less painful than top-nav patterns, but still a gap. | 2.4.1 Bypass blocks | Minor | Optional — given the screen is short, low priority. |

### Understandable

| # | Issue | WCAG | Severity | Recommendation |
|---|---|---|---|---|
| U1 | Heading order in /today: rendered DOM is `<h2>Hi, {name}</h2>` then later `<h1>{day.label}: {title}</h1>` ([today/page.tsx:61, 146](../src/app/(app)/today/page.tsx)). Screen readers using heading nav (rotor / `H` key) see h2 before h1 — confusing structure. | 1.3.1 Info & relationships / 2.4.6 Headings | Major | Either: (a) demote the greeting to a regular `<p>` and let the workout title be the first heading on the screen, or (b) make the greeting `<h1>` and the workout title `<h2>`. Option (a) is cleaner — "Hi, Alex" isn't really the page's heading, the workout is. |
| U2 | All button labels are imperative and clear ("Start workout", "Pick a program", "Set up days", "View calendar"). | 3.3.2 Labels | — | OK |
| U3 | No form inputs on /today; no error states to evaluate. | 3.3.1 / 3.3.2 | — | N/A |

### Robust

| # | Issue | WCAG | Severity | Recommendation |
|---|---|---|---|---|
| R1 | Bottom-nav `<nav>` has no `aria-label` ([bottom-nav.tsx:24](../src/components/bottom-nav.tsx)). If a future header `<nav>` is added, screen reader users won't be able to distinguish them. | 4.1.2 Name, role, value | Major | Add `aria-label="Primary"` on the bottom nav element. |
| R2 | Bottom-nav active item lacks `aria-current="page"` ([bottom-nav.tsx:30-39](../src/components/bottom-nav.tsx)). Screen readers announce all five tabs identically — no audible "you are here". | 4.1.2 / 1.3.1 | Major | Add `aria-current={active ? "page" : undefined}` to each `<Link>`. |
| R3 | Empty-state cards use `<div>` for grouping with embedded `<Link>`s. Semantic but unremarkable. | 4.1.2 | — | OK |
| R4 | The exercise `<ul>` / `<li>` is correctly used for a list of items. | 1.3.1 | — | OK |

### Color contrast summary

| Element | Foreground | Background | Ratio | Required | Pass |
|---|---|---|---|---|---|
| Body greeting motivation | `#a3a3a3` (neutral-400) | `#000` | 8.51:1 | 4.5:1 | ✅ |
| Phase/Week meta | `#737373` (neutral-500) | `#000` | 4.68:1 | 4.5:1 | ✅ (tight) |
| Estimated minutes | `#737373` | `#000` | 4.68:1 | 4.5:1 | ✅ (tight) |
| Exercise name (text-sm) | `#fff` | `#171717` | 17.4:1 | 4.5:1 | ✅ |
| Exercise sets meta (text-xs neutral-400) | `#a3a3a3` | `#171717` | 7.62:1 | 4.5:1 | ✅ |
| **Exercise progression hint** | **`#737373`** | **`#171717`** | **4.16:1** | **4.5:1** | **❌** |
| Bottom-nav inactive | `#737373` | `#000` (~) | 4.68:1 | 4.5:1 | ✅ (tight) |
| Bottom-nav active (lime) | `#a3e635` | `#000` | 15.7:1 | 4.5:1 | ✅ |
| Start workout button text | `#000` | `#a3e635` | 15.7:1 | 4.5:1 | ✅ |
| Start workout button text (rose accent) | `#000` | `#fb7185` | 6.5:1 | 4.5:1 | ✅ |
| Start workout button text (violet accent) | `#000` | `#a78bfa` | 7.0:1 | 4.5:1 | ✅ |

### Keyboard navigation

| Element | Tab order | Enter/Space | Notes |
|---|---|---|---|
| Empty-state CTA | 1 | navigates | No focus ring (O1) |
| Exercise list items | — | non-interactive | OK |
| Start workout button | 1 (last on main) | submits server action | No focus ring (O1) |
| Bottom-nav links | 2–6 | navigates | No focus ring; no `aria-current` |

### Screen reader pass

| Element | Announced as | Issue |
|---|---|---|
| `<h2>Hi, Alex` | "Heading level 2: Hi, Alex" | Heading order issue (U1) |
| `<h1>Push: Upper *Body*` | "Heading level 1: Push: Upper Body" | OK (italic doesn't change announcement) |
| Exercise card "Bench Press 4×8 · 135 lb" | "Bench Press 4 by 8 · 135 lb" | "×" reads as "by"; acceptable |
| Bottom nav | "Navigation, list, 5 items" | Should say "Primary navigation" (R1) |
| Active tab "Today" | "Today, link" | Should say "Today, current page, link" (R2) |
| 🎉 in completed state | "Party popper, you finished…" | Decorative emoji bleeds in (P7) |

---

## 2. Design critique

The screen is doing the right job: one CTA, one decision (start or don't), context above (what week, what phase, how long), preview below (which exercises and what loads). Hierarchy is clean.

### What works
- **Single primary action.** The full-width `h-14` Start button is the unambiguous next step. No competing CTAs.
- **Editorial heading treatment.** The italic display-font on the last word of the day title (`Upper *Body*`) gives the screen a personality without sacrificing legibility — a small premium-feeling touch on an otherwise minimal layout.
- **Progression context is in the right place.** The "+5 lb from W3" hint sits under each exercise where the user is mentally weighing "is this heavier than last time?" — exactly when that information helps.
- **Tabular-nums on the meta line.** `4×8 · 135 lb` aligns vertically across exercises, scannable at a glance.
- **Empty states are first-class.** Three distinct states (no program, no days, all weeks complete) each get their own short message + one obvious next action. No dead-ends.
- **The motivational line rotates by weekday.** Charming touch, low risk — it doesn't compete with the workout name for attention.
- **Time estimate is honest.** Rounded to 5 min with a clear heuristic (`~3 min/set`). The `~` prefix signals approximation.

### What to look at
1. **Greeting redundancy.** "Hi, Alex" is warm but sits on every visit forever. For a personal app with one user, consider promoting it to onboarding only, or making it more situational (time of day, streak status — "Day 3 in a row"). Low priority; not broken, just an opportunity.
2. **Day title formatting can wrap awkwardly.** `{day.label}: {titleRest} *{titleLast}*` — if the title is one word (e.g., `day.title = "Legs"`), `titleRest` is empty and you render `Legs: *Legs*`? Actually checking — `titleWords.pop()` takes the last word, joins the rest. If there's one word, `titleRest` is `""` and `titleLast` is the only word, producing `{day.label}: *{title}*`. Fine, but worth a quick eyeball test on a one-word title. The italic-final-word treatment is most rewarding when there are 2+ words.
3. **Phase/week label is uppercase tracking-wide.** Established convention — but combined with `text-xs` on a small phone, the letterspacing slightly hurts at-a-glance scan. Consider sentence-case or a non-tracked variant.
4. **No way to preview the workout in detail before starting.** The list shows exercise names + sets×reps × weight, but a user wondering "what's the rest interval?" or "any superset notes?" has to start the session to find out. If you ever add notes or supersets to the schema, surface them here in a collapsible.
5. **The "Deload · 70%" hint** appears under each exercise in deload weeks. Repeats N times. Consider a single banner above the list ("Deload week — all loads at 70%") and removing the per-exercise repetition.
6. **Estimated minutes precision.** `~5 min · 1 exercise` for an empty-ish day reads odd if reality is 8 minutes. The 3-min-per-set heuristic is decent but doesn't account for warm-up sets. Acceptable for v1.

### Visual hierarchy scorecard
- F-pattern compliant: top-left greeting → top-right meta → main heading → list → CTA at thumb zone (bottom). ✓
- Type scale: 11px → 12px → 14px → 16px → 20px → 24px. Six steps for one screen is slightly busy but each has a clear job. Consider collapsing the two `text-[11px]` instances into a single tier.

---

## 3. UX copy review

| Where | Copy | Verdict | Notes |
|---|---|---|---|
| Greeting | `Hi, {name}` | Clear, warm | Optional: vary by time/context. |
| Motivation | 7 rotating quotes | Fine | "Discipline beats motivation" is a known cliché — keep if that's the vibe, drop if you'd rather sound less hustle-bro. |
| No program empty state | `You don't have a program yet.` + `Pick a program` | ✅ | Direct, actionable. |
| No days empty state | `{program.name} has no days yet.` + `Set up days` | ✅ | Could be "Add a day to {name}" for symmetry, but current phrasing is fine. |
| Completed state | `🎉 You finished all {N} weeks. Time to plan the next block.` | ✅ | Warm and forward-looking. The CTA is `View calendar` which feels disconnected from "plan the next block" — consider `Start a new program` (links to `/program`) instead. |
| Phase line | `{phase} · Week {N}` / `{phase} · Week {N} · Deload` | ✅ | Tight. |
| Exercise meta | `{sets}×{reps} · {weight} lb` | ✅ | Tabular, scannable. |
| Progression hint | `+{X} lb from W{prior}` | ✅ | Specific and motivating. |
| `Baseline` hint | Single-word, week 1 only | ✅ | Could read `Week 1 baseline` for context, but single-word is consistent with `Deload · 70%`. |
| Time estimate | `~{N} min · {N} exercise(s)` | ✅ | Pluralization handled. |
| Start CTA | `Start workout` | ✅ | The right verb for the moment. |

**Tone summary.** Direct, concise, no jargon, no marketing. Reads like a coach's note, not an app. Stay the course.

**One tiny inconsistency.** "Pick a program" (verb-noun) vs "Set up days" (verb-particle-noun). Symmetry would suggest "Add days" or "Set up program". Not worth changing.

---

## 4. Design system audit

### Tokens defined ([globals.css](../src/app/globals.css))

```
@theme inline { --color-background, --color-foreground, --font-sans, --font-mono, --font-display, --animate-exercise-flip }
@theme         { --color-accent, --color-accent-foreground }
:root[data-theme="…"] { --color-accent }   // 5 themes
```

Solid foundation. The active-state lexicon comment at the top of the file is excellent — keep that pattern, extend it to other lexicons as they emerge.

### Issues

| # | Issue | Recommendation | Status |
|---|---|---|---|
| DS1 | Hardcoded hex in `btn-secondary` (`#262626`, `#e5e5e5`) and `btn-ghost-add` (`#404040`, `#d4d4d4`, `rgba(23,23,23,…)`) — these are Tailwind neutrals but expressed as raw hex instead of `var(--color-neutral-XXX)`. Drift risk if neutral palette ever shifts. | Either alias them in `@theme` (`--color-surface`, `--color-surface-hover`, `--color-border-default`) and reference, or use Tailwind's built-in CSS variables. | ✅ PR #21 — semantic tokens (`--color-surface`, `--color-surface-hover`, `--color-surface-subtle`, `--color-border`, `--color-border-strong`) added; button utilities reference them. |
| DS2 | No `--focus-ring` token. With O1 to fix, this is the time to introduce one — `--focus-ring: var(--color-accent)`. | Define once, apply in all button utilities. | ✅ PR #21 — `--focus-ring-width` / `--focus-ring-offset` / `--focus-ring-color` added; all three button utilities reference them. |
| DS3 | No semantic alias for muted text. `text-neutral-400`, `text-neutral-500` are scattered throughout (and as the audit shows, neutral-500 is borderline on dark surfaces). | Introduce `--color-text-muted` and `--color-text-subtle`, point them at neutral-400 / neutral-500, and migrate gradually. Single point of contrast control if WCAG levels change later. | ✅ PR #21 (token + /today migration); PR #22 collapsed `subtle` into `muted` because there's no contrast headroom for a third tier on this dark palette. Other screens (`/program`, `/history`, `/calendar`, `/settings`, `/body`, `/workout/*`) still use raw `text-neutral-*` — migrate per-screen in future a11y sweeps. |
| DS4 | `bg-black` and `text-white` in [(app)/layout.tsx:15](../src/app/(app)/layout.tsx) bypass the `--color-background` / `--color-foreground` tokens defined in `globals.css`. | Use `bg-background text-foreground` so the token chain is honored. | ✅ PR #20. |
| DS5 | Border colors hardcoded as `border-neutral-800` everywhere. | Could be `--color-border` token, but lower priority — the neutral-800 choice is consistent and intentional. | Partial — token defined in PR #21, `/today` + bottom-nav migrated. Other screens to follow. |
| DS6 | Two Tailwind utility libraries in deps: `tailwind-merge` and `clsx` (combined in `cn`). Standard, no issue — flagging because some teams later add `class-variance-authority` for variant systems. `class-variance-authority` is also in deps but unused on /today; if you adopt it, do so deliberately. | | Awareness flag, no action. |

### Component coverage

Hand-rolled primitives only — no shadcn, no Radix. For a single-user, mobile-first app this is appropriate. The screen uses six primitives:

- `btn-primary` (utility) — Start workout, empty-state CTAs
- `btn-secondary` (utility) — View calendar
- `btn-ghost-add` (utility) — not used on /today
- Generic Tailwind card pattern (`rounded-md border border-neutral-800 bg-neutral-900 p-4`) — repeated 4× across empty states + completed state, and per exercise in the list. **This is a candidate for a `card` utility** to keep the four occurrences in sync.
- `<header>` block with overline + h1 + sub-meta — repeated pattern likely on `/program`, `/history` too. Candidate to extract.
- BottomNav (component)

---

## 5. Design handoff (reverse spec)

Since the screen exists, this is documentation, not a brief. For an LLM coding-agent or future contributor.

### Layout

- Container: `<main class="max-w-md mx-auto pb-24 px-4 pt-6">` (from `(app)/layout.tsx`)
- Vertical rhythm: `space-y-6` between greeting / header / list / CTA blocks; `space-y-1` inside header for overline + h1 + sub-meta
- Top padding inside the page wrapper: `pt-8` on the inner div (so total ≈ 2.5rem from header chrome)

### Tokens (resolved values)

| Token | Value (lime default) |
|---|---|
| `--color-accent` | `#a3e635` |
| `--color-accent-foreground` | `#000` |
| `--color-background` | `#000` |
| `--color-foreground` | `#fff` |
| Body font | Geist Sans |
| Display font | `ui-serif, Georgia, "Times New Roman", serif` (used for italicized last word of h1) |

### Type scale (resolved on /today)

| Role | Class | Computed |
|---|---|---|
| Page h1 | `text-2xl font-semibold` (italic last word `font-display italic font-medium`) | 24px / 600 |
| Greeting h2 | `text-xl font-semibold` | 20px / 600 |
| Body / motivation | `text-sm` | 14px / 400 |
| Exercise name | `text-sm` | 14px / 400 |
| Exercise meta | `text-xs tabular-nums` | 12px / 400 |
| Phase overline | `text-xs uppercase tracking-wide` | 12px / 400 |
| Sub-meta + hint | `text-[11px]` | 11px / 400 |

### Components

- **Empty-state card**: `rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300 space-y-3`, contains `<p>` + `<Link class="btn-primary w-full h-11 text-sm">`
- **Workout summary header**: overline (`text-xs uppercase tracking-wide text-neutral-500`) + h1 (mixed sans + display-italic last word) + sub-meta (`text-[11px] text-neutral-500 tabular-nums`)
- **Exercise card**: `rounded-md border border-neutral-800 bg-neutral-900 p-3` containing a flex row (name + sets/reps/weight) and an optional progression hint
- **Primary CTA**: `<button class="btn-primary w-full h-14 text-base">Start workout</button>`

### Interaction states

| State | Spec | Status |
|---|---|---|
| Default | All as above | ✅ implemented |
| Hover | Implemented on btn-secondary, btn-ghost-add (background lift) | ✅ |
| Hover on btn-primary | Not defined | ⚠ inconsistent with btn-secondary |
| Disabled | `opacity: 0.5` via utility | ✅ |
| Focus-visible | **Not defined** | ✅ PR #19 (rings on btn utilities + bottom-nav) |
| Loading (form action pending) | No spinner / disabled state on Start workout while `startWorkout` runs | ✅ PR #20 — extracted to client `<StartWorkoutButton>` using `useTransition`; disables + shows "Starting…" while pending. |

### Edge cases

- 1-exercise day → "1 exercise" (not "1 exercises") ✅
- 0 exercises → ✅ PR #20 — `/today` now renders a dedicated empty-state card (`"{day.label}: {day.title} has no exercises yet."` + "Add exercises" CTA → `/program`) instead of an empty `<ul>` above an enabled Start button.
- All weeks complete → 🎉 message + View calendar CTA ✅
- No active program → empty-state card ✅
- In-progress session → server-side redirect to `/workout/{sessionId}` ✅

### Responsive behavior

- `max-w-md` (28rem / 448px) — fixed mobile column on tablet/desktop. Centered. No desktop layout. Acceptable given the brief (mobile-first PWA).
- iOS safe-area: handled in BottomNav (`pb-[env(safe-area-inset-bottom)]`).
- `/workout/*` hides BottomNav so the Finish button isn't covered.

---

## 6. User research / synthesis — N/A this round

These two skills (`design:user-research`, `design:research-synthesis`) are designed to ingest real research input — interview notes, session recordings, survey data, support tickets — and produce study plans or thematic syntheses. There's no input data to synthesize.

If you start logging gym friction (even a `notes.md` of "this hurt today"), I can run `research-synthesis` over it and produce theme clusters with frequency + severity. Worth it once you have ~15+ notes. For now, the design-critique findings above are the best proxy.

---

## 7. Implementation status

The audit has been worked through across four PRs. Below is the consolidated status by PR.

### ✅ PR #19 — `refactor/today-a11y-design-fixes` (2026-04-30)

Priority fixes:

1. **Removed `userScalable: false` and `maximumScale: 1`** in [src/app/layout.tsx](../src/app/layout.tsx). Pinch-zoom restored. *(P1)*
2. **`:focus-visible` styling** on `btn-primary`, `btn-secondary`, `btn-ghost-add` in [globals.css](../src/app/globals.css) and on bottom-nav `<Link>`s. *(O1)*
3. **Progression hint bumped to `text-neutral-400`** ([today/page.tsx:190](../src/app/(app)/today/page.tsx)). Resolves 4.16:1 contrast fail. *(P2)*
4. **`aria-label="Primary"` + `aria-current="page"`** in [bottom-nav.tsx](../src/components/bottom-nav.tsx). *(R1, R2)*
5. **Greeting demoted to `<p>`** so the workout `<h1>` is the first heading on the screen. *(U1)*

Nice-to-haves shipped in the same commit:

7. Empty-state CTAs bumped from `h-11` to `h-12`. *(O2)*
9. 🎉 wrapped in `aria-hidden`. *(P7)*

### ✅ PR #20 — `fix/today-followups`

- **DS4** — `(app)/layout.tsx` uses `bg-background text-foreground` so the token chain is honored.
- **Loading state on Start workout** — extracted to a client `<StartWorkoutButton>` using `useTransition`; disables + shows "Starting…" while pending. Closes the double-tap window noted in CLAUDE.md "known limitations."
- **Zero-exercise day guard** — `/today` renders an empty-state card pointing to `/program` instead of an empty `<ul>` above an enabled Start button.

### ✅ PR #21 — `refactor/design-tokens`

- **DS1** — semantic tokens (`--color-surface`, `--color-surface-hover`, `--color-surface-subtle`, `--color-border`, `--color-border-strong`) replace hardcoded hex inside `btn-secondary` / `btn-ghost-add`. Aliased to `var(--color-neutral-XXX)` so the whole app shares one color space.
- **DS2** — `--focus-ring-width` / `--focus-ring-offset` / `--focus-ring-color` introduced; all three button utilities reference them.
- **DS3** (token + `/today` migration) — `--color-foreground-muted` / `--color-foreground-subtle` defined; `/today` and bottom-nav JSX migrated. Other screens still on raw `text-neutral-*` and migrate per-screen.

### ✅ PR #22 — `refactor/today-a11y-polish`

- **P4** — collapsed `--color-foreground-subtle` into muted (neutral-400) because the dark palette has no contrast headroom for a third tier. The three borderline 4.68:1 sites (phase overline, time estimate, bottom-nav inactive) move to `text-foreground-muted`.
- **P6** — bottom-nav active state gets a 2×8px accent bar above the active tab as a non-color signal (no longer hue + stroke-width alone).
- **O6** — skip-to-main link in `(app)/layout.tsx`. `sr-only` until keyboard focus, then anchored top-left in the accent color. `<main>` has `id="main"`.

### Still deferred — judgment calls, not mechanical fixes

6. **Consolidate Deload signaling** — one banner instead of per-exercise hint repetition. UX call: per-exercise hint reinforces "this set is at 70%" mid-scan, banner is tidier but easier to miss. Revisit the next time you actually hit a deload week and pick what feels right at the gym.
8. **Add a `card` utility** (`@utility card`) for the four `rounded-md border-border bg-surface` occurrences. Premature today — only worth doing once a *second* screen has drifted (different padding, border color, etc.). Trigger: next time you find yourself copy-pasting that classlist.

### Still pending — bundled with future per-screen a11y sweeps

- DS3 / DS5 migration of `/program`, `/history`, `/calendar`, `/settings`, `/body`, `/workout/*` from raw `text-neutral-*` / `bg-neutral-900` / `border-neutral-800` to the semantic tokens. Tokens are ready; the work is per-screen QA + class swap.

---

*This review is static. To verify the contrast and focus changes once made, boot `npm run dev`, log in via magic link, hit /today on a phone (Lighthouse mobile audit + axe-core devtools extension catch ~30% of the issues automatically — do that before shipping), then keyboard-tab the screen with VoiceOver running on iOS for the remaining 70%.*