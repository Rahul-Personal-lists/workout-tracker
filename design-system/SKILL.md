---
name: workout-tracker-design
description: Use this skill to generate well-branded interfaces and assets for the Workout Tracker PWA, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files (`colors_and_type.css`, `preview/`, `assets/`, `ui_kits/mobile-app/`).

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. Lift components from `ui_kits/mobile-app/Components.jsx` and tokens from `colors_and_type.css`.

If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand. The codebase of record is `Rahul-Personal-lists/workout-tracker` (Next.js 16, Tailwind v4, Supabase) — match its Tailwind utility usage exactly.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions about screen, audience, fidelity, and constraints, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick rules
- Hard black canvas (`#000`); cards `#171717`; hairlines `#262626`.
- Primary CTA = `bg-white text-black`. Emerald-500 is the only accent — used sparingly.
- Geist Sans for everything; `font-variant-numeric: tabular-nums` on every numeric readout.
- 44px minimum tap target. `max-w-md` (448px) centered column. Mobile-first.
- No shadows. No gradients (one exception: bottom protection gradient on `/workout/[id]`).
- Icons are exclusively Lucide. No emoji except the single 🎉 on program-complete.
- Copy: terse, sentence case, second-person imperative, no exclamations, no filler.
