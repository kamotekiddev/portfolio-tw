# Feature Specification: Automatic light/dark theme by time of day

**Feature Branch**: `feat/auto-theme-by-time`
**Created**: 2026-11-11
**Status**: Implemented; verified in Chromium only
**Input**: "Auto toggle the light mode and dark mode depending on the time of day at the visitor's location."

## Clarifications

### Session 2026-11-11
- Q: How is day or night decided? → A: Fixed local hours on the visitor's device clock: light from 06:00 until 18:00, dark otherwise. No location permission, no network, no sunrise/sunset calculation.
- Q: How does this relate to the dark/light toggle and the dark default? → A: Three-way mode Auto / Light / Dark. Auto is the default for new visitors; an explicit Light or Dark choice is never overridden. This deliberately replaces "dark by default" for first-time visitors with JavaScript.
- Q: Should the theme change while a page stays open? → A: Yes, at the 06:00 and 18:00 boundaries (and when a hidden tab becomes visible again).

## User Scenarios & Testing

### User Story 1 — Theme follows my local time (P1)
A first-time visitor sees the light theme during the day and the dark theme at night, based on their device's local time, on every page, without flashing the wrong theme first.
**Independent test**: Set the device clock to 10:00 and 22:00 and load each route in a fresh browser profile; confirm light then dark.
**Acceptance**: Given no stored choice, when the local hour is 06:00–17:59 then light is shown; otherwise dark. The correct theme is present at first paint. Existing visitors who had chosen Light or Dark keep that choice.

### User Story 2 — Choose Auto, Light or Dark (P2)
A visitor uses the header toggle to cycle Auto → Light → Dark → Auto. The choice is remembered.
**Independent test**: Using only the keyboard, press the toggle through all three modes, reload, confirm the mode and theme persist.
**Acceptance**: The control's accessible name states the mode (and the current theme while in Auto). Light and Dark stay fixed regardless of time. Auto resumes following the clock. Works alongside the season picker, independent of the season.

### User Story 3 — Theme changes while I'm reading (P3)
With Auto active and the page open, the theme switches at 06:00 and 18:00 without a reload, and a tab left hidden across a boundary corrects itself when shown again.
**Independent test**: Install a fake clock at 17:59:50, wait past 18:00, confirm dark; do the reverse at 05:59:50.
**Acceptance**: No change occurs in Light or Dark modes. No page-wide transition flash beyond the existing disabled-transition behaviour.

### Edge Cases
Scripts disabled (dark shown, as today); clock or time zone changed mid-session; storage unavailable (Auto still works per load, a manual choice lasts for the page view); invalid stored mode (treated as Auto); a legacy stored `theme` of light or dark with no mode (treated as an explicit choice); several tabs open (a mode change in one tab is picked up by the others); a tab left in the background across a boundary; exactly 06:00 and 18:00.

## Requirements
- **FR-001**: Support three modes: Auto, Light, Dark. Auto is the default when no valid choice is stored.
- **FR-002**: In Auto, show light when the device's local hour is 6 to 17 inclusive, dark otherwise.
- **FR-003**: Detection MUST NOT request location or send the time, zone, or choice anywhere.
- **FR-004**: The resolved theme MUST be applied before first paint with JavaScript available; no visible flash of the opposite theme.
- **FR-005**: The header control MUST cycle Auto → Light → Dark → Auto, be keyboard operable with visible focus, have an accessible name starting `Theme:` that states the mode and, in Auto, the current theme, and show an icon for the mode.
- **FR-006**: The choice MUST persist across pages and visits and MUST be independent of the season.
- **FR-007**: A stored Light or Dark choice (including a legacy stored theme with no mode) MUST never be overridden by the clock.
- **FR-008**: In Auto, the theme MUST update at the 06:00 and 18:00 boundaries while the page is open and when a hidden tab becomes visible, and MUST NOT change in Light or Dark.
- **FR-009**: Without JavaScript the existing dark design is shown and all content and navigation work.
- **FR-010**: Existing metadata, social preview, season behaviour, and no-flash season script MUST be unchanged.
- **FR-011**: Regression coverage MUST include the hour boundaries, mode parsing, legacy migration, the init script's parity with the pure functions, and browser checks for first paint, persistence, cycling, and live switching. Existing tests that depended on the two-state toggle are updated.

### Key Entities
**Theme mode**: auto | light | dark, stored on the device only. **Resolved theme**: light | dark, derived from the mode and the local hour.

## Success Criteria
- **SC-001**: For every hour of the day the resolved theme in Auto matches the rule (24 of 24).
- **SC-002**: No wrong-theme paint on load: the theme class is correct at `domcontentloaded` in every mode.
- **SC-003**: Any mode is reachable in at most two activations and survives reload.
- **SC-004**: A boundary crossed with the page open changes the theme within 1 second of the boundary in Auto, and never in Light or Dark.
- **SC-005**: Both themes remain AA-compliant in all six seasons (existing contrast test unchanged and passing).
- **SC-006**: Header controls remain usable without overflow at 390, 768, and 1440 pixel widths.

## Assumptions
Day is a fixed 06:00–18:00 window; sunrise/sunset and latitude are out of scope. "Your location" is the device's local clock and time zone. The dark default for no-JS and unrecognised states is retained. `next-themes` remains the mechanism that applies the class. Cross-tab sync uses the browser `storage` event and is best effort. When browser storage is blocked, Auto still paints the right theme at first paint through the document class; one corrected frame after hydration is accepted in that case.
