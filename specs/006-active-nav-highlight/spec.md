# Feature Specification: Highlight the current navigation item

**Feature Branch**: `006-active-nav-highlight`
**Review amendments (2026-11-12, Sage)**: malformed-hash crash, short-viewport settling, release flicker, blog 404 ownership and tall-viewport bottom rule folded into FR-001, FR-003 and FR-005.
**Created**: 2026-11-12
**Status**: Implemented; verified in Chromium only
**Input**: "I wanted to highlight the navigation I'm currently on."

## Clarifications

### Session 2026-11-12
- Q: Which item counts as current? → A: On blog routes (`/blog` and every article), "Blog". On the home page, the section the visitor is reading (Work, Experience, About, Contact), updating as they scroll. Nothing is highlighted while the hero is in view, or on the 404 page. (Atlas default.)
- Q: What does the highlight look like? → A: The existing hover underline, kept visible, plus the accent colour. Same font size and weight, so nothing shifts. (Atlas default, in the flat design language; the owner can ask for another style.)

## User Scenarios & Testing

### User Story 1 — I can see where I am (P1)
A visitor scrolling the home page sees the header link for the section they are reading highlighted. On the blog index or an article, "Blog" is highlighted.
**Independent test**: Scroll from top to bottom of the home page, then open `/blog` and an article; check which link is highlighted at each point.
**Acceptance**: Exactly one link is highlighted when a section is in view (none in the hero). The highlight follows scrolling in both directions, and after a nav click it lands on the clicked section.

### User Story 2 — Assistive technology announces it too (P2)
**Acceptance**: The highlighted link carries `aria-current="page"` on blog routes and `aria-current="location"` for the home section. No other link carries `aria-current`.

### Edge Cases
Page loaded with a hash (`/#about`), short final section (Contact must still become current at the bottom of the page), back/forward between hashes, client-side navigation home ↔ blog, mobile layout where the nav wraps under the logo, both themes and all seasons, no JavaScript, and reduced motion.

## Requirements
- **FR-001**: On every page rendered by the blog layout (`/blog` and articles), the Blog link MUST be highlighted with `aria-current="page"`, including in the server-rendered HTML (works without JavaScript). The layout tells the header (`<Header current="blog" />`), so the server and client always agree. The site-wide 404 highlights nothing. Unknown blog URLs (`/blog/unknown-slug`, `/blog/a/b`) render that site-wide 404, because `[slug]` sets `dynamicParams = false`, so they highlight nothing too.
- **FR-002**: On `/`, the link of the section that crosses an activation line just below the sticky header MUST be highlighted with `aria-current="location"`. When the page is scrolled to the bottom, the last section (Contact) MUST be current. While the hero is in view, nothing is highlighted.
- **FR-003**: Activating a section link MUST make that link current once the scroll settles, with no frame showing the previously current section. Loading the page with a hash MUST highlight that section, at any viewport height, including short landscape phones (the activation line is never above the scroll-padding offset). A malformed hash (e.g. `/#%`) MUST NOT throw.
- **FR-004**: The highlight MUST be visible without hover: accent colour plus the persistent underline. It MUST meet WCAG AA (4.5:1) against the header ground in both themes and all six seasons. It MUST NOT change the link's size, weight or position (no layout shift) and MUST keep visible focus.
- **FR-005**: Scroll tracking MUST be passive (a passive scroll/resize listener, rAF-throttled; no scroll-jank), MUST clean up on unmount, and MUST NOT animate when reduced motion is preferred. The colour change may use the existing 180 ms transition otherwise.
- **FR-006**: No new dependency. Nav markup stays a `<nav aria-label="Main navigation">` with plain links, and keyboard order is unchanged.
- **FR-007**: Regression coverage: Blog current on `/blog` and an article (with and without JavaScript); each home section becomes current as it is scrolled to, and nothing is current at the hero; hash load; nav click; bottom-of-page Contact; exactly one `aria-current` at a time; contrast; no overflow at 390, 768 and 1440 px.

## Success Criteria
- **SC-001**: At every scroll position checked, at most one nav link is current, and it matches the section under the activation line.
- **SC-002**: Blog is current on 100% of blog routes, in server HTML.
- **SC-003**: The current link's contrast is at least 4.5:1 in all 12 season × theme combinations.
- **SC-004**: Lint, TypeScript, unit tests, build and all browser suites pass.

## Assumptions
The section ids `work`, `experience`, `about` and `contact` stay as they are. The 404 page highlights nothing. The header is shared by the home, blog and 404 layouts, so the change applies everywhere.
