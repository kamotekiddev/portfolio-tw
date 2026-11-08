# Feature Specification: Blog section navigation

**Feature Branch**: `feat/blog-section-navigation`
**Created**: 2026-11-08
**Status**: Ready for implementation
**Input**: Add side hyperlinks to jump quickly to article sections.

## User Scenarios & Testing

### User Story 1 — Jump to a section (P1)
Readers see article section names in reading order and select one to jump directly to its heading.
**Independent test**: Open a published article, follow each contents link, confirm its matching heading is visible.
**Acceptance**: Given an article with headings, when selecting a contents link, then the matching heading becomes the fragment destination. Repeated headings have distinct destinations. No-heading articles show no empty navigation.

### User Story 2 — Navigate on every device (P2)
Readers use a persistent side navigation on wide screens and a compact expandable navigation on narrow screens.
**Independent test**: Navigate using keyboard and touch-sized viewport with scripts disabled.
**Acceptance**: Desktop navigation remains available while reading; mobile contents expands and links work without scripts. Hero title and summary keep the shared full-width alignment.

### Edge Cases
Duplicate or punctuation-only heading names; formatted text and images inside headings; non-Latin names; code fences containing heading syntax; no headings; long labels; long contents lists; deeply nested headings.

## Requirements
- **FR-001**: List only high-level H2 body headings in order, showing their readable names; omit lower-level subsections.
- **FR-002**: Every listed section must have a stable, unique destination, including duplicate and non-Latin headings.
- **FR-003**: Provide sticky side navigation on wide screens and a compact expandable navigation on smaller screens; omit it when there are no headings.
- **FR-004**: Links and expandable control must support keyboard use, visible focus, and navigation without scripts; destinations must remain visible after jumping.
- **FR-005**: Preserve full-width hero, content, publication filtering, existing links, themes, and responsive gutters; body may share available width with desktop navigation.
- **FR-006**: Add regression checks for heading extraction/destination parity and browser navigation.

### Key Entities
Section: readable label, heading level, unique destination; derived from the article body, never separately authored.

## Success Criteria
- **SC-001**: Every contents link resolves to exactly one matching body heading.
- **SC-002**: Readers can reach each section with one link activation after opening compact contents where needed.
- **SC-003**: At 390, 768, and 1440 pixel widths in both themes, navigation causes no page overflow and headings remain visible on arrival.
- **SC-004**: Navigation works with scripts disabled and with a keyboard; no content is added to draft public surfaces.

## Assumptions
Use H2 headings only for navigation; all supported H2–H6 headings retain linkable anchors. Active-section tracking, search, manual heading metadata and external services are out of scope. Keep article hero full width; only body and side navigation share a grid.
