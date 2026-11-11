# Quickstart: validating the seasonal theme

See [the contract](contracts/season-contract.md) and [data model](data-model.md) for the rules.

## Automated

```sh
npm run lint
npx tsc --noEmit
npm run test:blog        # includes tests/seasons.test.ts
npm run build
npm run test:blog:e2e    # includes tests/season.spec.ts
```

Expected: all pass; routes remain statically rendered in the build output.

## Manual browser checks

Run `npm run dev`, then at 390, 768, and 1440 px in dark and light:

1. Browser devtools → Sensors → set the location/time zone to `Asia/Manila`, `Europe/Berlin`,
   `Australia/Sydney`, and `UTC`. Reload each: expect wet (in November), autumn, spring, and the
   plain emerald design.
2. Open the season control with the keyboard, choose each season, reload: the choice persists and
   the accent and ambient effect match. Choose Automatic: the detected season returns.
3. Emulate `prefers-reduced-motion: reduce`: no ambient motion, palette still applied.
4. Disable JavaScript: emerald design, all content and navigation usable.
5. Confirm no horizontal overflow and that the ambient layer never blocks clicks or text selection.

## Contrast evidence (T007, SC-002)

WCAG 2.1 contrast ratios for the shipped tokens (owner feedback 2026-11-11: neutrals now follow
the season too). Spring keeps the original emerald tokens and declares no neutrals of its own;
every other season overrides ground, surface, ink, muted, accent, accent-hover, on-accent, and
contact with values tinted toward its hue (summer ~42, autumn ~22, winter ~205, wet ~190, dry ~5).
Grounds stay near charcoal (HSL lightness 9%) or near white (95-96%); grounds and surfaces keep
HSL saturation at or below 15%. The light wet accent moved from hue ~186 to ~191 so Manila's
November season reads blue-teal rather than green; the dark wet accent `#5fd0d8` already reads cyan
against the new neutrals (side-by-side browser comparison) and is unchanged. Ratios were computed by Pixel with a standalone script; `tests/season.spec.ts`
("palette contrast") asserts the same pairs from live computed styles. Every pair is at least 4.5:1.

Tokens:


| Season / theme | ground | surface | ink | muted | accent | accent-hover | on-accent | contact |
|---|---|---|---|---|---|---|---|---|
| spring light | `#f5f6f3` | `#e9ede7` | `#17231f` | `#52615a` | `#086d4e` | `#06563e` | `#ffffff` | `#dce9e0` |
| spring dark | `#141917` | `#1c2420` | `#edf1e9` | `#adb8ae` | `#64dba3` | `#8ae8bb` | `#102319` | `#223a2e` |
| summer light | `#f6f5f3` | `#eeece8` | `#252118` | `#666052` | `#8a5c00` | `#6b4700` | `#ffffff` | `#f0e6c8` |
| summer dark | `#1a1814` | `#26231c` | `#f0eee9` | `#bcb8ae` | `#eec35a` | `#f5d68b` | `#2a1f05` | `#383119` |
| autumn light | `#f6f4f3` | `#eeeae8` | `#261d18` | `#655952` | `#a8420a` | `#863407` | `#ffffff` | `#f5e2d5` |
| autumn dark | `#1a1614` | `#25201d` | `#f0ecea` | `#bcb3ae` | `#f6955a` | `#f9b387` | `#2c1406` | `#3f2a1e` |
| winter light | `#f3f5f6` | `#e8ebed` | `#182026` | `#525d65` | `#1c5e8c` | `#15496e` | `#ffffff` | `#d9e6ef` |
| winter dark | `#14181b` | `#1d2226` | `#e9edf0` | `#aeb6bc` | `#8ccbf2` | `#b2ddf7` | `#0c1e2b` | `#21333f` |
| wet light | `#f0f3f4` | `#e8edee` | `#182325` | `#536265` | `#095e71` | `#074b5a` | `#ffffff` | `#d6e6ea` |
| wet dark | `#111a1d` | `#192327` | `#eaeff0` | `#afb9bb` | `#5fd0d8` | `#8ce0e5` | `#0a2224` | `#1e3739` |
| dry light | `#f6f3f3` | `#eee9e8` | `#251918` | `#675351` | `#9c4650` | `#7c363f` | `#ffffff` | `#efdcdc` |
| dry dark | `#1a1514` | `#261e1d` | `#f0eae9` | `#bcafae` | `#e4a39f` | `#eebfbc` | `#2a1414` | `#3c2b2a` |

Contrast (particle = accent at the layer opacity, 0.12 light / 0.22 dark, over the ground):

| Season / theme | accent/ground | accent/surface | accent-hover/ground | accent-hover/surface | on-accent/accent | on-accent/accent-hover | ink/ground | ink/surface | muted/ground | muted/surface | ink/contact | muted/contact | accent/contact | ink/particle | muted/particle | accent/particle |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| spring light | 5.85 | 5.36 | 8.04 | 7.36 | 6.35 | 8.72 | 14.93 | 13.68 | 6.02 | 5.51 | 12.94 | 5.22 | 5.07 | 12.55 | 5.06 | 4.92 |
| spring dark | 10.33 | 9.23 | 12.14 | 10.84 | 9.56 | 11.23 | 15.54 | 13.88 | 8.67 | 7.75 | 10.72 | 5.98 | 7.13 | 9.40 | 5.25 | 6.25 |
| summer light | 5.34 | 4.93 | 7.63 | 7.04 | 5.81 | 8.31 | 14.72 | 13.59 | 5.74 | 5.30 | 12.87 | 5.02 | 4.67 | 12.51 | 4.88 | 4.54 |
| summer dark | 10.63 | 9.40 | 12.56 | 11.10 | 9.71 | 11.47 | 15.29 | 13.52 | 8.95 | 7.92 | 11.17 | 6.54 | 7.76 | 9.12 | 5.34 | 6.34 |
| autumn light | 5.55 | 5.09 | 7.64 | 7.01 | 6.09 | 8.37 | 15.07 | 13.82 | 6.17 | 5.66 | 13.15 | 5.39 | 4.85 | 12.65 | 5.18 | 4.66 |
| autumn dark | 8.01 | 7.19 | 10.12 | 9.08 | 7.74 | 9.78 | 15.31 | 13.73 | 8.72 | 7.83 | 11.46 | 6.53 | 6.00 | 10.08 | 5.75 | 5.28 |
| winter light | 6.34 | 5.79 | 8.69 | 7.94 | 6.93 | 9.50 | 15.08 | 13.77 | 6.17 | 5.63 | 12.97 | 5.31 | 5.45 | 12.65 | 5.18 | 5.32 |
| winter dark | 10.15 | 9.12 | 12.39 | 11.14 | 9.66 | 11.79 | 15.16 | 13.63 | 8.69 | 7.81 | 11.08 | 6.35 | 7.42 | 9.21 | 5.27 | 6.16 |
| wet light | 6.60 | 6.24 | 8.71 | 8.22 | 7.37 | 9.71 | 14.42 | 13.61 | 5.70 | 5.38 | 12.53 | 4.96 | 5.74 | 12.03 | 4.76 | 5.51 |
| wet dark | 9.67 | 8.77 | 11.69 | 10.61 | 9.08 | 10.98 | 15.22 | 13.81 | 8.81 | 7.99 | 10.90 | 6.31 | 6.92 | 9.34 | 5.41 | 5.94 |
| dry light | 5.59 | 5.13 | 7.75 | 7.11 | 6.17 | 8.55 | 15.46 | 14.18 | 6.49 | 5.95 | 12.95 | 5.44 | 4.68 | 13.07 | 5.48 | 4.72 |
| dry dark | 8.64 | 7.81 | 11.03 | 9.97 | 8.31 | 10.60 | 15.20 | 13.73 | 8.51 | 7.68 | 11.23 | 6.29 | 6.39 | 9.77 | 5.47 | 5.56 |

Lowest muted on contact: 4.96 (wet light). Ambient layer opacity is unchanged, capped at 0.12
(light) and 0.22 (dark); the worst case with a particle directly behind text is accent text in
summer light at 4.54. Raising the light cap to 0.13 would drop that pair to 4.47, below 4.5, which
is why the effect is faint in the light theme.
