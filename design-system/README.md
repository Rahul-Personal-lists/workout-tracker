# Workout Tracker — Design System

Mobile-first PWA Rahul uses to log strength programs at the gym. Personal app, single user, multi-user-ready (RLS on every table). Ships with 4 preset templates (12-week strength, PPL, Upper/Lower, Full Body 3x) plus a blank-program builder. The app shell is built; iteration is now driven by what actually hurts at the gym.

This folder is the design system extracted from the running codebase. Use it to mock new screens, prototype features, or generate marketing/onboarding artifacts that look like the real app.

---

## Sources

| Source | Status | Notes |
|---|---|---|
| Codebase: `Rahul-Personal-lists/workout-tracker` (GitHub) | ✅ pulled | Next.js 16, Tailwind v4, Supabase. Read via the GitHub connector — `src/app/(app)/*`, `src/components/*`, `src/app/globals.css`, `CLAUDE.md`, `BUILD_SPEC.md`. |
| `uploads/calendar.fig`, `color-swatch.fig`, `gradient.fig`, `gradient-1.fig`, `homepage.fig`, `icons.fig`, `login.fig`, `overall.fig`, `workouts.fig` | ⚠️ **NOT received** | The Figma files were referenced in the brief but `uploads/` arrived empty. The system below is therefore reverse-engineered from the **codebase truth** (Tailwind classes in source = ground truth for color/spacing/type). If the Figma intent diverges from the live app, the Figma should win — please re-attach. |

---

## TL;DR — the visual language

- **Hard black canvas** (`#000`), neutral-900 cards, neutral-800 hairline borders.
- **White is the brand color.** Primary CTA is `bg-white text-black`. Emerald-500 is the *accent* — reserved for active rest timer, completed sets, "current week" indicator, and the final "Finish workout" success state. Never both at once on the same surface.
- **Geist Sans** for everything; **Geist Mono** (via `tabular-nums`) for any numeric readout (weights, reps, durations, dates).
- **Mobile-only chrome**: `max-w-md` (448px) centered column, fixed bottom nav with safe-area inset, sheet-style modals from the bottom edge.
- **44px minimum tap target** everywhere. The complete-set button is `h-11 w-11` exactly.
- **No shadows. No gradients** (one exception: the bottom protection gradient on `/workout/[id]` so the Finish button reads over scrolled content).
- **No emoji** except a single 🎉 on the program-complete state. **No decorative SVGs** the team didn't ship — icons are exclusively `lucide-react`.

---

## CONTENT FUNDAMENTALS

The product is a **personal tool** Rahul wrote for himself. Copy is terse, lowercase-leaning, and direct. There's no marketing register anywhere — the app talks to one person.

### Voice
- **Second person, implied subject.** "Pick a program," "Finish workout," "Add exercise." Imperatives without "you."
- **Sentence case** for everything. Even page titles (`Today`, `History`, `Settings` are the only Title-Cased strings — they're proper-noun routes).
- **Numbers tell the story.** A row says `4×5 · 75 lb`, not "4 sets of 5 reps at 75 pounds." The middle dot (` · `) is the canonical separator for compact metadata.
- **No exclamation marks.** No "Let's…", "Great job!", "You crushed it!" The closest the app comes to a celebration is `🎉 You finished all 12 weeks. Time to plan the next block.` and even that is one sentence and a dry follow-up.
- **No filler.** Empty states are one sentence and a button. `"You don't have a program yet."` → `[Pick a program]`.
- **Eyebrow labels are uppercase + tracked.** `WEEK 3 · DAY 2`, `DANGER ZONE`, `PHOTOS (OPTIONAL)`. They tell you *what kind of thing* you're looking at; the title underneath tells you the *specific thing*.

### Examples lifted from the codebase

- Header eyebrow: `Foundation · Week 3` / `Build · Week 6 · Deload`
- Empty: `"You don't have a program yet."`
- Empty CTA: `"Pick a program"` / `"Set up days"` / `"Add photo"` / `"Add more"`
- Status under header: `3/24 sets done`
- Set hint: `last: 70 × 5`
- Login: `"Sign in with a magic link."` / `"Send magic link"` / `"Sending…"` / `"Check rahul@example.com for the sign-in link."`
- Danger zone: `"Delete all workout sessions and set logs. You have 14 sessions. Your program and exercises stay."`
- Notes placeholder: `"Felt strong, bumped weight on…"`

### Casing / punctuation rules
- "and" before the last item in a list, no Oxford comma in tight UI strings (`"deloads on 4, 8, 12"`).
- Pending state uses an ellipsis: `Sending…`, `Finishing…` — single character `…` not three dots.
- Units always have a leading space: `75 lb`, `60s`, `45 sec hold`.
- Compound stat strings use ` · ` (space-mid-dot-space) as the separator: `4×5 · 75 lb`.
- The literal "lb·reps" (no space) is the unit for total volume — that's intentional.

### Tone vibes
> Built for a focused person mid-set, sweaty, looking down at a phone between bench reps. Nothing on screen should ask for your attention; everything should answer a question you just asked.

---

## VISUAL FOUNDATIONS

### Color
- **Background:** pure `#000`. The app is permanently dark — no light mode and no system-preference branch (the Tailwind `prefers-color-scheme` block in `globals.css` is dormant; the body forces `bg-black text-white`).
- **Elevation by lightness, not shadow.** A card is `bg-neutral-900` (`#171717`) on `bg-black`. A sheet is `bg-neutral-950` (`#0a0a0a`) — slightly *darker* than the cards behind it, which inverts the usual elevation metaphor and reads as "this thing is closer to the page."
- **Borders, not shadows.** Every card, input, day-section, and pill has a 1px `border-neutral-800` (`#262626`) hairline. Focus deepens it to `border-neutral-600`.
- **Accent: emerald-500.** Only for: completed set fill (`bg-emerald-500 border-emerald-500 text-black`), active rest timer (`bg-emerald-500/10 border-emerald-500/40` with `text-emerald-300/400`), "current week" pill outline, primary success affordance ("Finish workout" inside the confirmation sheet).
- **Danger: red-500.** Settings danger zone uses `border-red-500/30 bg-red-500/5`; error text uses `text-red-400`.
- **Image plate: neutral-100.** Exercise GIF frames sit on a near-white backing (`bg-neutral-100`) so the dark line art reads against the dark UI. This is the *only* light-colored surface in the app.

### Type
- **Geist Sans** is the only sans (`next/font` injects it via `--font-geist-sans`). Weights actually used: 400, 500, 600. No 700/800.
- **Geist Mono** is reserved for tabular numerics — applied via `font-variant-numeric: tabular-nums` on already-Sans elements rather than swapping family. Weights are stable.
- **Tight scale.** Body is `text-sm` (14px). Inputs and primary buttons are `text-base` (16px) — iOS won't auto-zoom inputs ≥16px. Page titles are `text-2xl` (24px) `font-semibold`. Eyebrows are `text-xs` (11px), uppercase, `tracking-wide`. Set hints under inputs are `text-[10px]`.
- **No display type. No serif.** Numbers in monospace and uppercase eyebrows do all the typographic flavor work.

### Spacing
- 4px base. Components use the standard Tailwind scale (`gap-1.5`, `gap-2`, `gap-3`, `p-3`, `p-4`).
- Card padding is **`p-3`** (12px), not the usual 16px — this is a tight, dense layout because every screen is read mid-set.
- Vertical rhythm between major blocks is **`space-y-5`** or **`space-y-6`** at the page level, **`space-y-2`** inside lists.
- Page gutter is **`px-4`** (16px). Container is **`max-w-md mx-auto`** (448px).

### Backgrounds & imagery
- **No background images, no patterns, no gradients in the chrome.** The page is flat black.
- **One gradient, used once:** a `bg-gradient-to-t from-black via-black/95 to-transparent` strip that fades the bottom of `/workout/[id]` so the sticky Finish button has a legibility plate over scrolling content. This is a *protection gradient*, not decoration.
- **Imagery is functional only.** Exercise reference frames from `yuhonas/free-exercise-db` (public domain) — `/0.jpg` + `/1.jpg` overlaid with a 1.6s opacity-flip CSS keyframe (`@keyframes exercise-flip` in globals.css). No JS animation loop; the GIF is faked with two `<img>` tags. Optional session photos uploaded by the user appear as 3-column thumb grids inside the finish sheet — `aspect-square`, `object-cover`, `rounded-md`, `bg-neutral-900`.

### Animation & motion
- **Almost none.** This is a deliberate choice — mid-set the user wants the UI to be still.
- The only running animations:
  1. **Exercise flip** — `@keyframes exercise-flip` opacity 1→0→1 over 1.6s, infinite. Pure CSS.
  2. **Rest timer countdown** — number tick at 250ms via `setInterval` (not really an animation, just polled state).
  3. **Vibration on rest end** — `navigator.vibrate?.([200, 80, 200])`. Two pulses, no sound.
- **Transitions:** the only transition class in the codebase is `transition-colors` on the Finish workout button (for the disabled→loading fade) and the set-complete checkbox (for the empty→emerald flip). No `transition-all`. No layout transitions. No `transition-transform`.
- **Easing:** `ease-in-out` on the exercise flip; the rest defaults to Tailwind's default (cubic-bezier(0.4, 0, 0.2, 1)). 200ms-ish.

### Hover & press
- **Hover is barely used** — this is a touch-first product. Where it appears: `hover:border-neutral-700` on the history-list cards (subtle border-lift). That's it.
- **Active/pressed states aren't styled** explicitly — the platform default tap-highlight is allowed to show through. The exception is the set-complete checkbox, where the *state* (completed: `bg-emerald-500`) is the visual feedback, not a transient press effect.
- **Disabled state:** `opacity-50` + `disabled:opacity-50` on submit buttons. No grayscale, no swap-out.

### Borders & shadows
- **Borders:** 1px solid `neutral-800` for everything. Dashed variant (`border-dashed border-neutral-700`) for "create blank program" and "Add day" affordances — visually flagged as *generative* affordances vs. *navigational* cards.
- **Shadows:** none. No `shadow-sm`, no `shadow-md`, no `box-shadow` anywhere in the stylesheet. Elevation is encoded in **background lightness + border**, not depth.

### Radii
- `rounded` (4px) — internal pills (week chips), set rows.
- `rounded-md` (6px) — **default for everything**: buttons, cards, inputs, day cards.
- `rounded-lg` (8px) — exercise cards, finish-sheet outer cards (when nested in a denser context).
- `rounded-t-xl` (12px top-only) — the bottom-sheet modal.
- `rounded-full` (9999px) — the photo-thumb close button (6×6 round pill).
- **No mixed radii** on a single element. No micro-radii (no 2px). No `rounded-2xl` or larger.

### Layout rules
- **Fixed:** `BottomNav` (`fixed bottom-0 inset-x-0 z-40`, hidden on `/workout/*`). The `/workout` finish button (`fixed bottom-0`, `z-30`). The rest-timer bar is *not* fixed — it sits inline at the top of the exercise list so it doesn't cover content.
- **`pb-[env(safe-area-inset-bottom)]`** is honored on the bottom nav and on the finish sheet's bottom padding (`pb-[calc(env(safe-area-inset-bottom)+1rem)]`).
- **The page wrapper is `max-w-md mx-auto pb-24 px-4 pt-6`** — leave 96px of bottom padding for the nav, 16px gutters, 24px top.
- **Z-index ladder:** nav `z-40`, finish-button strip `z-30`, sheet overlay `z-50` (overlay sits on top of everything).

### Transparency & blur
- **`bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/70`** on the bottom nav — graceful enhancement: 95% opaque black where blur isn't supported, 70% with blur where it is. This is the *only* blur in the app.
- **`bg-black/70`** scrim behind the finish sheet — no blur on the scrim, just dim.
- **Translucent tints** for status surfaces: `bg-emerald-500/10` (rest active), `bg-red-500/5` (danger zone), `bg-neutral-800/60` (completed set row).

### Component DNA — what a "card" looks like
```
border: 1px solid #262626   (neutral-800)
background: #171717          (neutral-900)
border-radius: 6px           (rounded-md)  or 8px for exercise/day cards
padding: 12px                (p-3)
no shadow
no gradient
```
This single recipe is reused across Today, Program, History list, History detail, Settings, and the empty-state cards. Variations are **content density + radius bump**, not new visual identity.

---

## ICONOGRAPHY

The app uses **`lucide-react`** exclusively (`v0.454.0`). It's loaded as a tree-shaken React component import — no icon font, no SVG sprite. For static HTML in this design system we mirror that with **the Lucide CDN** (`https://unpkg.com/lucide-static@0.454.0/icons/<name>.svg`) — same icon set, same stroke weights, identical to production.

### Icons in use (mapped from source)
| Icon | Used for | Source file |
|---|---|---|
| `CalendarDays` | Today nav | `bottom-nav.tsx` |
| `Dumbbell` | Program nav, brand glyph | `bottom-nav.tsx` |
| `History` | History nav | `bottom-nav.tsx` |
| `Scale` | Body nav | `bottom-nav.tsx` |
| `Settings` | Settings nav | `bottom-nav.tsx` |
| `Play` | "Start W3" button | `program/page.tsx` |
| `Plus` | Add exercise / Add day / New program / +15s | `program/page.tsx`, `rest-timer.tsx` |
| `Minus` | -15s rest adjust | `rest-timer.tsx` |
| `Check` | Set-complete tick (strokeWidth 3) | `workout-client.tsx` |
| `X` | Close sheet, remove photo, stop rest | `workout-client.tsx`, `rest-timer.tsx` |
| `Camera` | Add photo affordance | `workout-client.tsx` |

### Rules
- **Stroke width** defaults to `1.75` for inactive nav, `2.25` for active nav, `3` for the set-complete check (more emphatic — confirms a destructive-feeling commitment).
- **Sizes:** `w-3.5 h-3.5` (14px) inline with text, `w-4 h-4` (16px) for sheet/button affordances, `w-5 h-5` (20px) for nav and primary toggles.
- **Color** is inherited (`currentColor`). Never custom-stroked.
- **No emoji as icons** — except the literal 🎉 on the program-complete state. Don't add more.
- **No unicode glyphs** standing in for icons (no ▸, no ✕, no ⌃). Always Lucide.
- **No custom-drawn SVGs.** If Lucide doesn't have it, the screen doesn't get it.

The brand glyph is the letter **W** rendered by `next/og` at 192×192, emerald-on-black, weight 800 (`src/app/icon.tsx`). This is the favicon / PWA icon. There is no separate logotype.

---

## INDEX — what's in this folder

```
README.md                    ← you are here
SKILL.md                     ← skill manifest for Claude Code / agent invocation
colors_and_type.css          ← all CSS custom properties + helper classes

assets/
  icons/                     ← Lucide SVGs we lifted (offline copies of the set used)
  brand/                     ← W glyph in PNG/SVG

preview/                     ← cards rendered in the Design System tab
  colors-surface.html
  colors-accent.html
  colors-danger.html
  type-scale.html
  type-eyebrow.html
  spacing-radii.html
  spacing-tap.html
  components-buttons.html
  components-card.html
  components-set-row.html
  components-rest-timer.html
  components-bottom-nav.html
  components-week-strip.html
  components-input.html
  brand-glyph.html
  brand-iconography.html

ui_kits/
  mobile-app/
    README.md
    index.html               ← interactive click-thru of the PWA
    Tokens.jsx               ← JS mirror of the design tokens
    Icon.jsx                 ← Lucide icons we actually use, inline
    Components.jsx           ← all primitives + screens (Login, Today,
                               Workout, Program, History, Body, Settings,
                               BottomNav)
```

---

## CAVEATS

- **Figma files never arrived.** Everything visual here is reverse-engineered from the live Tailwind utilities in the codebase. If the Figma intent differed (e.g., on the login screen or homepage), it will not be reflected. Please re-upload the `.fig` files via the Import menu.
- **Geist** is loaded from Google Fonts via `@import` for offline cards. The production app uses `next/font` which is byte-for-byte the same family, but if you're bothered by an FOUT in cards, swap to a self-hosted woff2.
- **No light mode.** The codebase has a dormant `prefers-color-scheme: dark` block but the body forces black/white. Don't design a light variant unless Rahul asks.
