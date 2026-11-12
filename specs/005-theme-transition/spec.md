# Feature Specification: Circle-reveal theme transition

**Feature Branch**: `005-theme-transition`
**Created**: 2026-11-12
**Status**: Implemented; verified in Chromium only
**Input**: "Add animation when the whole app changes its theme, and dark or light mode."

## Clarifications

### Session 2026-11-12
- Q: Which animation style? → A: Circle reveal. The new appearance spreads from the control the visitor pressed until it covers the viewport. Chosen by the owner over a page-wide crossfade and a mixed approach.
- Q: Which changes animate? → A: Changes the visitor starts: the light/dark toggle and choosing a season. Automatic changes (Auto mode at 06:00/18:00, a tab becoming visible, another tab's change, first load and hydration) stay instant, because nothing was pressed to reveal from and an unprompted page-wide sweep would be distracting. (Atlas default, recorded as an assumption.)

## User Scenarios & Testing

### User Story 1 — Light/dark switch reveals from the toggle (P1)
A visitor presses the theme toggle. The new theme grows outward in a circle from the toggle until it covers the whole viewport, then the page is fully in the new theme.
**Independent test**: Press the toggle by mouse and by keyboard on the home page and an article; observe the circle originating at the toggle and finishing in about half a second.
**Acceptance**: The reveal starts at the toggle's centre, covers every corner of the viewport, and ends with the same page state as an instant switch (theme class, stored mode, toggle icon, label, accessible name). Focus stays on the toggle.

### User Story 2 — Season change reveals from the season control (P2)
A visitor chooses a different season from the season picker. The new season's colours grow outward in a circle from the season control.
**Independent test**: Open the picker, choose another season by mouse and by keyboard; observe the reveal from the season control.
**Acceptance**: Same as Story 1 with the season attribute and stored season preference. Choosing the season already shown changes nothing visible and need not animate.

### User Story 3 — Comfortable and robust for everyone (P1)
Visitors who prefer reduced motion, and browsers without the needed support, get today's instant switch. Rapid repeated presses never leave the page in a mixed or wrong state.
**Independent test**: Emulate `prefers-reduced-motion: reduce` and press the toggle; remove View Transitions support and press it; press it five times quickly.
**Acceptance**: Reduced motion and unsupported browsers switch instantly with no animation. After rapid presses the final theme matches the final selection and no reveal is left stuck.

### Edge Cases
Toggle pressed during a running reveal; season and theme changed back to back; page scrolled to the middle (reveal is relative to the viewport, not the document); narrow 390 px viewport and wide 1440 px viewport (circle must reach the farthest corner); sticky header and seasonal particle layer during the reveal; tab hidden mid-reveal; scripts disabled (no toggle behaviour changes; dark design as today); automatic theme or season changes (instant).

## Requirements

### Functional Requirements
- **FR-001**: When the visitor activates the theme toggle, the change MUST be shown as a circle reveal centred on the toggle, growing until it covers the entire viewport.
- **FR-002**: When the visitor chooses a different season in the season picker, the change MUST be shown as a circle reveal centred on the season picker's trigger button.
- **FR-003**: The reveal MUST last about 500 ms (between 400 and 600 ms) using the site's ease-out curve, and MUST NOT delay the stored preference or focus. The theme class, season attribute, icon and accessible name commit inside the transition callback, one frame after the press, so they appear together in the new snapshot.
- **FR-004**: Automatic changes MUST NOT animate: Auto boundaries, visibility or focus re-syncs, other-tab changes, first load, hydration, and client-side navigation.
- **FR-005**: With `prefers-reduced-motion: reduce`, or where the browser lacks the View Transitions API, the change MUST apply instantly exactly as today.
- **FR-006**: A new activation during a running reveal MUST NOT leave the page in a wrong or mixed state; the final state MUST match the last selection. Because the browser sends every pointer event to `<html>` while a view transition is active, a pointer press during a reveal ends the reveal and the swallowed click is replayed on the element under the pointer, so no click (on the toggle or anywhere else) is lost.
- **FR-007**: The end state after a reveal MUST be identical to the instant switch: theme class, `data-season`, stored values, icons, labels, accessible names, and colour tokens (no lingering pseudo-elements, overlays, or blocked pointer events).
- **FR-008**: No layout shift, no horizontal scroll, and no change to semantic markup, keyboard access, or visible focus. The no-JS experience is unchanged.
- **FR-009**: No new runtime dependency.
- **FR-010**: Regression coverage MUST include: reveal requested from the right origin for both controls; instant switch under reduced motion and without View Transitions; no reveal for automatic changes; correct end state after rapid presses; no overflow at 390, 768 and 1440 px.

### Key Entities
**Reveal origin**: the centre point of the activated control in viewport coordinates. **Reveal radius**: distance from the origin to the farthest viewport corner.

## Success Criteria
- **SC-001**: In a supporting browser, 100% of visitor-started theme and season changes animate as a reveal from the activated control; 0% of automatic changes animate.
- **SC-002**: The reveal finishes within 600 ms and covers all four viewport corners at 390, 768 and 1440 px widths.
- **SC-003**: With reduced motion or without View Transitions, the switch completes in the same frame as today (no animation).
- **SC-004**: After five presses within one second, the shown theme matches the stored mode and the page responds to the next press normally.
- **SC-005**: Lint, TypeScript, unit tests, production build and the existing browser suites pass, and both themes remain AA-compliant in all six seasons.

## Assumptions
Uses the browser View Transitions API (Chromium, Safari 18+, Firefox 144+); other browsers keep the instant switch, which is acceptable progressive enhancement. The reveal animates the new page snapshot over the old one, so content is never hidden. `next-themes` stays the mechanism that applies the theme class. Browser checks run in Chromium only, as in earlier features.

## Known limitations
- A click replayed during a reveal is a plain `.click()`: modifier keys (ctrl/cmd-click to open a new tab) and middle-click are not carried over within that ~500 ms window.
- A change synced from another tab in the ~16 ms between a press and its transition callback can be overwritten by that press. This needs a cross-tab change in that exact frame and was accepted.
- Bundled Chromium 158 crashes the renderer if a new view transition starts while the previous `::view-transition-new(root)` animation is still running; the helper cancels the reveal animation before skipping, which avoids it (stable Chrome 157 is unaffected).
