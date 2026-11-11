# Research: Seasonal theme

## Region from time zone

- **Decision**: Classify the IANA zone from `Intl.DateTimeFormat().resolvedOptions().timeZone` into `north-temperate`, `south-temperate`, `north-tropical`, `south-tropical`, or `unknown` using a compact table in `app/data/seasons.ts`: explicit tropical and southern lists, then a default band per area prefix. `UTC`, `GMT`, `Etc/*`, empty, and unlisted prefixes are `unknown`.
- **Rationale**: No permission, no network, static pages, works offline. Region-level precision is what the owner chose.
- **Alternatives**: IP geolocation headers (forces dynamic rendering, host-specific); Geolocation API (permission prompt); UTC-offset heuristics (cannot tell hemisphere).

## Season from band and month

- **Decision**: Use the device's local month (`Date#getMonth`) with the month tables in the spec's Assumptions.
- **Rationale**: Meteorological seasons are whole months, so no day arithmetic or astronomy is needed; local month matches the same device clock that supplies the zone.
- **Alternatives**: Astronomical seasons (date maths, little visible benefit); per-country monsoon calendars (unbounded data).

## Applying the season without a flash

- **Decision**: An inline script in the root layout, generated from the same data as the pure functions, reads the stored preference and zone, then sets or removes `data-season` on `<html>` before first paint. `<html>` already has `suppressHydrationWarning`.
- **Rationale**: Satisfies FR-010 while keeping pages static; mirrors how `next-themes` applies the theme class.
- **Alternatives**: `useEffect` (visible flash); cookie + server render (dynamic rendering, first visit still wrong).

## Theming mechanism

- **Decision**: CSS custom-property overrides keyed on `[data-season]` and `.dark[data-season]` in `app/globals.css`, overriding `--accent`, `--accent-hover`, `--on-accent`, `--contact`, and (amended 2026-11-11) the neutrals `--ground`, `--surface`, `--ink`, `--muted`. No attribute means today's emerald values apply. Spring reuses the emerald values.
- **Rationale**: All components already consume these tokens; typography and layout stay fixed as FR-004 requires.
- **Alternatives**: Extra `next-themes` theme names (couples season to dark/light; 12 themes); Tailwind theme variants (the site styles with plain CSS tokens).

## Ambient effect

- **Decision**: A server-rendered, `aria-hidden`, `pointer-events: none`, fixed layer of at most 18 spans behind content, animated by CSS keyframes selected by `[data-season]`; hidden when there is no season and under `prefers-reduced-motion: reduce`.
- **Rationale**: No client JavaScript, no canvas, no dependency; compositor-only properties keep scrolling smooth; reduced motion is handled declaratively.
- **Alternatives**: Canvas 2D or the installed `ogl` WebGL library (client bundle, lifecycle, battery cost for a decorative layer); `framer-motion` particles (JS-driven, heavier).

## Picker

- **Decision**: One client component in the header: a button that opens a menu of seven radio items (Automatic + six seasons). It writes `localStorage["season"]` and updates `data-season` directly. Disabled until mounted, like the theme toggle.
- **Rationale**: Two interactions to change season (SC-003); fits the narrow header; no context provider needed because the DOM attribute is the shared state.
- **Alternatives**: Native `<select>` (hard to fit and style at 390 px); cycling button (up to six presses, no "automatic" affordance).

## Testing

- **Decision**: node:test for the 48 band×month combinations, fallbacks, preference parsing, and the init script executed in a `node:vm` sandbox; Playwright with `timezoneId` and a fixed clock for detection, persistence, no-flash attribute presence, reduced motion, no-JS, and overflow.
- **Rationale**: Reuses both existing harnesses; no new tooling.
