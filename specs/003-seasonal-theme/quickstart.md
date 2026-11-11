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

WCAG 2.1 contrast ratios for the shipped tokens. Grounds, surface, ink, and muted are unchanged;
each season overrides accent, accent-hover, on-accent, and contact. Computed by Pixel, recomputed
independently by Sage, and asserted from live computed styles by `tests/season.spec.ts`
("palette contrast"). Every pair is at least 4.5:1.

| Season / theme | accent / hover / on-accent / contact | accent on ground | accent on surface | hover on ground | on-accent on accent | on-accent on hover | ink on contact | accent on contact |
|---|---|---|---|---|---|---|---|---|
| spring light | #086d4e #06563e #ffffff #dce9e0 | 5.85 | 5.36 | 8.04 | 6.35 | 8.72 | 12.94 | 5.07 |
| spring dark | #64dba3 #8ae8bb #102319 #223a2e | 10.33 | 9.23 | 12.14 | 9.56 | 11.23 | 10.72 | 7.13 |
| summer light | #8a5c00 #6b4700 #ffffff #f0e6c8 | 5.36 | 4.91 | 7.66 | 5.81 | 8.31 | 13.00 | 4.67 |
| summer dark | #eec35a #f5d68b #2a1f05 #383119 | 10.66 | 9.52 | 12.59 | 9.71 | 11.47 | 11.32 | 7.76 |
| autumn light | #a8420a #863407 #ffffff #f5e2d5 | 5.61 | 5.14 | 7.72 | 6.09 | 8.37 | 12.90 | 4.85 |
| autumn dark | #f6955a #f9b387 #2c1406 #3f2a1e | 7.93 | 7.08 | 10.01 | 7.74 | 9.78 | 11.76 | 6.00 |
| winter light | #1c5e8c #15496e #ffffff #d9e6ef | 6.39 | 5.85 | 8.76 | 6.93 | 9.50 | 12.74 | 5.45 |
| winter dark | #8ccbf2 #b2ddf7 #0c1e2b #21333f | 10.11 | 9.03 | 12.34 | 9.66 | 11.79 | 11.40 | 7.42 |
| wet light | #0a6670 #074f57 #ffffff #d4e8e8 | 6.15 | 5.63 | 8.55 | 6.67 | 9.27 | 12.73 | 5.24 |
| wet dark | #5fd0d8 #8ce0e5 #0a2224 #1e3739 | 9.74 | 8.70 | 11.78 | 9.08 | 10.98 | 11.05 | 6.92 |
| dry light | #9c4650 #7c363f #ffffff #efdcdc | 5.68 | 5.21 | 7.88 | 6.17 | 8.55 | 12.29 | 4.68 |
| dry dark | #e4a39f #eebfbc #2a1414 #3c2b2a | 8.50 | 7.59 | 10.85 | 8.31 | 10.60 | 11.69 | 6.39 |

Lowest muted on contact: 4.96 (dry light). Ambient layer opacity is capped at 0.12 (light) and
0.22 (dark); the worst case with a particle directly behind text is accent text in summer light
at 4.56. Raising the light cap to 0.14 would fall below 4.5, which is why the effect is faint in
the light theme.
