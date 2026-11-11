# Feature Specification: Seasonal theme

**Feature Branch**: `feat/seasonal-theme`

**Created**: 2026-11-10

**Status**: Implemented (amended 2026-11-11: FR-017, FR-019); verified in Chromium only

**Input**: User description: "I want to implement seasonal theme on this portfolio. It will be based on where the portfolio is viewed and will show differently based on the user's current season."

## Clarifications

### Session 2026-11-10

- Q: How should the site work out which season a visitor is in? → A: From the visitor's device time zone and the current date. No permission prompt, no location lookup service.
- Q: Which season model applies, given that tropical regions have no spring/summer/autumn/winter? → A: Four temperate seasons flipped by hemisphere, plus wet and dry seasons for tropical regions (six seasons).
- Q: How much of the design changes with the season? → A: The accent palette plus a subtle ambient effect per season. This is a deliberate change to the "type and nothing else" baseline in `docs/redesign-notes.md`.
- Amendment 2026-11-11 (owner feedback after review): accents alone still left the page reading as green because the ground, surface, text, and muted neutrals kept the original green tint. Those neutrals now take a restrained tint of each season's hue too (FR-004).
- Amendment 2026-11-11 (owner request, supersedes the menu in FR-008): the season control becomes a single-press toggle like the dark/light one. It cycles only through the seasons that exist in the visitor's region, in order, starting after the current season; arriving back at the current season means Automatic. Regions with no detectable season show no control (FR-018).
- Amendment 2026-11-11 (owner request, supersedes FR-018's region-limited toggle): visitors can freely choose any of the six seasons from a menu again. The menu is restyled in the site's design language, and choosing the season that is currently detected for the visitor's location means Automatic (it is marked "Automatic").
- Q: Can visitors pick a season themselves? → A: Yes. Automatic by default, with a remembered manual choice and a way back to automatic.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the portfolio in my current season (Priority: P1)

A visitor opens the portfolio and sees it coloured for the season where they are. Someone in Manila in November sees the wet-season theme; someone in Berlin on the same day sees autumn; someone in Sydney sees spring. Both dark and light themes carry the season.

**Why this priority**: This is the feature. Without location-aware season selection and seasonal colours there is nothing to show.

**Independent Test**: Open the site with the device time zone and date set to known combinations and confirm the season shown matches the season table in the Assumptions section, in both dark and light themes.

**Acceptance Scenarios**:

1. **Given** a visitor whose device is in a northern temperate time zone in January, **When** they open any page, **Then** the winter theme is shown.
2. **Given** a visitor whose device is in a southern temperate time zone in January, **When** they open any page, **Then** the summer theme is shown.
3. **Given** a visitor whose device is in a northern tropical time zone (for example Manila) in November, **When** they open any page, **Then** the wet-season theme is shown; in February the dry-season theme is shown.
4. **Given** any season is shown, **When** the visitor switches between dark and light themes, **Then** the season stays the same and both themes remain legible.
5. **Given** a visitor moves between the home page, the blog index, an article, and the not-found page, **When** each page loads, **Then** the same season is shown on all of them.
6. **Given** scripts are unavailable or the device region cannot be recognised, **When** the page loads, **Then** the existing emerald design is shown with all content and navigation working.

---

### User Story 2 - Choose a season myself (Priority: P2)

A visitor uses a control in the header to preview any of the six seasons or return to automatic. Their choice is remembered on later visits, the same way the dark/light choice is.

**Why this priority**: Lets visitors explore the themes and correct a wrong guess, but the site is already valuable with automatic selection alone.

**Independent Test**: Using keyboard only, open the season control, choose each season in turn, reload, and confirm the choice persists; choose automatic and confirm the detected season returns.

**Acceptance Scenarios**:

1. **Given** the automatic season is shown, **When** the visitor chooses a different season from the header control, **Then** the page changes to that season immediately without a reload.
2. **Given** the visitor chose a season, **When** they return later or navigate to another page, **Then** the chosen season is still shown.
3. **Given** the visitor chose a season, **When** they choose automatic, **Then** the season for their device region and date is shown and remembered as automatic.
4. **Given** the season control, **When** it is operated by keyboard or a screen reader, **Then** each option is reachable, named, shows visible focus, and the current choice is announced.
5. **Given** a 390-pixel-wide viewport, **When** the header is shown, **Then** the season control, theme toggle, and navigation remain usable without page overflow.

---

### User Story 3 - Subtle seasonal atmosphere (Priority: P3)

Each season adds a restrained ambient effect behind the content (for example drifting snow in winter, falling leaves in autumn, rain in the wet season) that sets the mood without getting in the way of reading.

**Why this priority**: Adds character but is purely decorative; the seasonal palette already delivers the core experience.

**Independent Test**: For each season, confirm an ambient effect is present, sits behind content, does not intercept pointer or keyboard interaction, and is absent when the visitor prefers reduced motion.

**Acceptance Scenarios**:

1. **Given** any season, **When** the page is shown, **Then** that season's ambient effect appears behind the content and text remains legible over it.
2. **Given** the visitor prefers reduced motion, **When** the page is shown, **Then** no ambient motion plays and the seasonal palette still applies.
3. **Given** the ambient effect is showing, **When** the visitor clicks, selects text, tabs, or uses a screen reader, **Then** the effect is never a target and is not announced.
4. **Given** the visitor changes season with the control, **When** the new season applies, **Then** the ambient effect changes to match.

---

### Edge Cases

- Device reports a generic or unrecognised time zone (for example UTC): the existing emerald design is shown; the visitor can still choose a season manually.
- Scripts disabled: existing emerald design, no season control dependency for content or navigation.
- Visit on the first or last day of a season, or a page left open across a season boundary: the season is evaluated when a page loads; a boundary crossed mid-visit applies on the next load.
- A remembered choice that is no longer valid (corrupted or from an older version): treated as automatic.
- Storage unavailable (private browsing restrictions): automatic selection still works; a manual choice lasts for the current page view at minimum.
- Visitor on a VPN or travelling: the device time zone governs, not network location.
- Low-power or small devices: the ambient effect must not make scrolling or interaction feel sluggish.
- Dark/light theme and season are changed in quick succession: both selections are respected independently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST support six seasons: spring, summer, autumn, winter, wet, and dry.
- **FR-002**: By default the site MUST select the season from the visitor's device time zone and current date, using the region bands and month ranges in Assumptions.
- **FR-003**: Season detection MUST NOT request location permission and MUST NOT send the visitor's time zone or location to any service.
- **FR-004**: Each season MUST define its own accent, ground, surface, text, and muted colours for both dark and light themes, so the whole page follows the season rather than only its accents. Grounds stay near-charcoal in dark and near-white in light with a restrained tint of the season's hue; typography and layout MUST remain as they are. Spring keeps the original emerald values.
- **FR-005**: In every season and both themes, text and interactive elements MUST meet WCAG 2.1 AA contrast (4.5:1 body text, 3:1 large text and focus indicators) against their backgrounds.
- **FR-006**: When no season can be determined, or scripts are unavailable, the site MUST show the existing emerald design with all content and navigation usable.
- **FR-007**: The season MUST apply consistently on the home page, blog index, articles, and not-found pages.
- **FR-008**: The header MUST offer a control to choose automatic or any of the six seasons. The control MUST be keyboard operable, have an accessible name, show visible focus, and expose the current choice.
- **FR-017** (added 2026-11-11, owner request): The season control's button MUST show the icon of the season currently applied to the page, and only while the preference is Automatic a small "A" badge on that icon, so a visitor sees at a glance both which season is showing and that it is automatic. A manual choice shows that season's icon with no badge. In Automatic with no detectable season (unrecognised region) the button shows the neutral compass icon with the badge. The badge is decorative (`aria-hidden`); the button's accessible name is unchanged.
- **FR-018** (added 2026-11-11, supersedes the menu in FR-008): The season control MUST be a single button that advances through the seasons available in the visitor's region in this order: spring, summer, autumn, winter for temperate regions (4 seasons), and wet, dry for tropical regions (2 seasons). Starting from the current season (the Automatic state) each press shows the next season; the press that arrives back at the current season selects Automatic again, so cycling always returns to Automatic. Seasons that do not exist in the region are never offered. In a region where no season is detected (unrecognised time zone) the control is not shown. A stored manual season that is not available in the current region is treated as Automatic. The button's accessible name starts `Season:` and states the mode (`Season: Auto (currently autumn)`, `Season: Winter`); it shows the applied season's icon plus the Automatic badge (FR-017), a text label on hover, focus and for about two seconds after each press (same behaviour and styling as the theme toggle's label, FR-012 of spec 004), and the new icon animates in like the theme toggle's (FR-013 of spec 004). Only one of the two header labels is visible at a time. The menu, its seven items, and the six-season choice are removed.
- **FR-019** (added 2026-11-11, supersedes FR-018): The season control MUST be a button that opens a menu listing all six seasons (spring, summer, autumn, winter, wet season, dry season) in that fixed order, from which the visitor can choose any season regardless of region. The row for the season currently detected for the visitor's location MUST carry a visible "Automatic" tag, and choosing that row selects Automatic (the stored preference becomes `auto`); choosing any other season is a manual choice. In a region where no season is detected, the menu has one extra first item, "Automatic", that applies the default emerald design. The selected row is clearly marked. The button keeps the applied season's icon, the Automatic badge (FR-017), and the hover/focus/after-choice label and icon animation of spec 004 (the label stays hidden while the menu is open). The menu is fully keyboard operable and styled only with the site's tokens and type (flat, no border, shadow, or gradient), with AA contrast in both themes and all seasons. A stored manual season is honoured in every region (FR-018's region rule is removed), and the control is shown in every region.
- **FR-009**: A manual choice MUST take effect immediately, MUST be remembered across visits and pages, and MUST be independent of the dark/light choice.
- **FR-010**: On load, visitors with scripts available MUST NOT see the page painted in one season's colours and then switch to another.
- **FR-011**: Each season MUST have a subtle ambient effect rendered behind content that never intercepts input, is hidden from assistive technology, and keeps body text at AA contrast (FR-005) even directly behind a particle; muted or accent text directly behind a particle may drop to no less than 3:1 (amended 2026-11-11 so the effect is visible in the light theme).
- **FR-012**: Ambient motion MUST NOT play when the visitor prefers reduced motion.
- **FR-013**: The ambient effect MUST NOT cause layout shift or page overflow at 390, 768, and 1440 pixel widths.
- **FR-014**: Season definitions (names, month ranges, region bands, colours) MUST be kept as editable data separate from presentation.
- **FR-015**: The social preview image, site metadata, and existing dark-default/persistent-light behaviour MUST be unchanged.
- **FR-016**: Automated regression checks MUST cover season selection for each region band across month boundaries, the unrecognised-region fallback, and remembered manual choice in a browser.

### Key Entities

- **Season**: one of six named themes; has a display name, accent colours for dark and light, and an ambient effect.
- **Region band**: northern temperate, southern temperate, northern tropical, southern tropical, or unknown; derived from the device time zone.
- **Season preference**: automatic or one specific season; remembered on the visitor's device only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every region band and every month of the year, the season shown matches the season table (48 of 48 combinations), and unrecognised regions show the existing design.
- **SC-002**: All six seasons in both themes (12 combinations) pass AA contrast for body text, links, buttons, and focus indicators.
- **SC-003**: A visitor can change season in at most two interactions from any page, and the choice is still in effect after reload.
- **SC-004**: On load there is no visible season colour change after first paint for returning or first-time visitors with scripts available.
- **SC-005**: With reduced motion preferred, zero ambient animation is observed in any season.
- **SC-006**: At 390, 768, and 1440 pixel widths in both themes, no page overflow occurs and all header controls remain operable.
- **SC-007**: With scripts disabled, every page shows its full content and working navigation in the existing design.
- **SC-008**: Scrolling and interaction remain smooth with the ambient effect running on a mid-range phone-sized viewport.

## Assumptions

- **Temperate seasons** use meteorological months. Northern: spring March–May, summer June–August, autumn September–November, winter December–February. Southern: spring September–November, summer December–February, autumn March–May, winter June–August.
- **Tropical seasons**: northern tropics wet June–November, dry December–May; southern tropics wet December–May, dry June–November. These are regional generalisations, not local forecasts.
- **Region bands** are a best-effort classification of device time zones into the four bands; a zone spanning bands takes the band of its reference city. Precision is region-level by design.
- The emerald palette that exists today is retained as the fallback design and may also serve as one season's accent; the plan decides which.
- The season control is in the shared header alongside the existing theme toggle.
- Out of scope: weather-based themes, holiday themes, server-side or network location lookup, precise geolocation, seasonal copy or imagery changes, per-season social preview images, and analytics on season choice.
- The ambient effect is decorative only; no separate on/off switch is provided beyond the reduced-motion preference.
- This feature deliberately extends the "type and nothing else" direction in `docs/redesign-notes.md` with seasonal accents and a restrained ambient layer; that document is updated as part of the work.
