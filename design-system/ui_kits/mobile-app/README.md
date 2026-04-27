# Mobile App UI Kit — Workout Tracker PWA

Click-thru recreation of the live Next.js PWA at `Rahul-Personal-lists/workout-tracker`. Built as a single HTML file (`index.html`) using React + Babel inline so it works without a build step.

## What's in here

- **`index.html`** — interactive prototype. Boots to the Login screen, lets you "magic-link in" (fake), browses Today / Workout / Program / History / Settings.
- The components are defined as `<script type="text/babel">` blocks inside `index.html`. They use the design tokens from `../../colors_and_type.css`.

## Screens
- **Login** — email + magic link
- **Today** — eyebrow (phase · week · deload), exercise list, "Start workout" CTA
- **Workout** — elapsed timer, rest timer, exercise cards with weight/reps/✓ rows, bottom Finish button
- **Program** — week strip, 4 day cards with exercise lists
- **History** — list of completed sessions
- **Settings** — user, sign out, danger zone

## Conventions matched from source
- Black canvas, neutral-900 cards, neutral-800 hairline borders
- Primary CTA = `bg-white text-black`; success accent = emerald-500
- 44px set-complete tick, 56px primary buttons
- Bottom nav fixed with safe-area inset; auto-hides on Workout
- Eyebrows uppercase tracked, neutral-500
- All numeric readouts in `font-variant-numeric: tabular-nums`

## Caveats
- Magic link / Supabase auth is faked — clicking "Send magic link" just advances the screen.
- Exercise reference GIFs (`/0.jpg` + `/1.jpg` flip) are stubbed with placeholder plates — real app pulls from `yuhonas/free-exercise-db`.
- Rest timer countdown is real (using `setInterval`), the rest of the persistence is in-memory.
