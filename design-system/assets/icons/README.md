# Icons

Production uses `lucide-react@^0.454.0`. For static HTML cards in this design system we reference the matching Lucide CDN:

```html
<img src="https://unpkg.com/lucide-static@0.454.0/icons/check.svg" />
```

Or, when rendered inline-stroke (so they inherit `currentColor`), use the inline SVG snippets in `ui_kits/mobile-app/Icon.jsx`.

## Set used in product

| Lucide name | Used for |
|---|---|
| `calendar-days` | Today nav |
| `dumbbell` | Program nav, brand |
| `history` | History nav |
| `scale` | Body nav |
| `settings` | Settings nav |
| `play` | Start workout |
| `plus` | Add exercise / day / +15s |
| `minus` | -15s |
| `check` | Set complete (strokeWidth 3) |
| `x` | Close, remove photo |
| `camera` | Add photo |

Stroke widths: `1.75` inactive nav, `2.25` active nav, `3` for set-complete check, `2` (default) elsewhere.
