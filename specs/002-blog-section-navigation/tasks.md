# Tasks: Blog section navigation

## Phase 1 — Setup
- [x] T001 Create specification/design/contracts in specs/002-blog-section-navigation/ and pass constitution gates.

## Phase 2 — Shared headings
- [x] T002 [US1] Add edge-case regression tests in tests/article-headings.test.ts (FR-001/002/006).
- [x] T003 [US1] Implement shared getArticleHeadings and remarkArticleHeadings in app/data/article-headings.ts; integrate ArticleBody.tsx (FR-001/002).

## Phase 3 — Navigation
- [x] T004 [P] [US1] Add server-rendered ArticleContents.tsx and integrate [slug]/page.tsx; omit no-heading contents (FR-001/003).
- [x] T005 [US2] Add desktop sticky/right sidebar and compact native details, target offset/focus in app/globals.css (FR-003/004/005).

## Phase 4 — Integration
- [x] T006 Run heading tests, existing blog tests, lint, TypeScript, build; independent review and browser checks; record evidence here (FR-004/005/006).
- [x] T007 Refresh Graphify after code edits and restart local preview; record completion here.

## Dependencies and parallel execution
T001 precedes all. T002 then T003; T004 can run parallel with shared helper implementation using agreed contract. T005 follows T004. T006 follows T003/T005. T007 follows code edits.

## Implementation strategy
Ship working anchor destinations first (US1), then responsive navigation layout (US2), then combined validation. No deployment authorized.

## Acceptance evidence

- Spec/plan/tasks analysis: all six functional requirements mapped; no ambiguity, duplication, constitution conflicts, or critical gaps. Built-in requirements checklist passed; extension hooks absent.
- `npm run test:blog`: 20/20 passing (15 existing +5 heading-model cases). Shared AST parity covers formatted labels, H2–H6, Unicode normalization/non-Latin text, punctuation fallback, duplicate/natural-suffix collisions, no headings, fenced-code exclusion.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`: passed. Existing draft/publication validation still passes. Standard blog test command now includes all unit test files.
- `npm run test:blog:e2e -- --grep "article section navigation"`:1/1 passing on isolated production fixture. Unique rendered targets, keyboard activation/heading focus, native compact details and no-JS anchors, sticky desktop sidebar, full-width hero and no overflow at390/768/1024/1440.
- Direct live Chromium checks390/768/1440 in light/dark: no page overflow; hero width equals reading layout. At1024 both themes also pass; sidebar sticky and compact hidden. Long sidebar has bounded viewport max-height and internal overflow scrolling (source-reviewed).
- Independent Sage review: no actionable findings. Atlas inspected desktop screenshot; QA inspected desktop/mobile/1024light.
- Screenshots: `/tmp/blog-toc-desktop.png`, `/tmp/blog-toc-mobile.png`, `/tmp/blog-toc-1024-light.png` (local QA artifacts).
- Heading-free extraction is unit-tested and component omission source-reviewed; no heading-free browser fixture was introduced. WebKit binary unavailable; mobile verification used Chromium emulation.
- Graphify refreshed (747 nodes,973 edges); community-label warning reports labels may be stale after topology change. Local graph remains usable; no LLM labeling run.
- Development preview restarted on localhost3000. No commit, push, PR, or deployment performed.

## High-level navigation refinement
- [x] T008 [US1] Select only H2 sections through app/data/article-headings.ts getArticleSections; preserve all heading anchors. Integrate selector in article page and remove subsection indentation. Regression tests cover mixed depths and no-H2 bodies.

Refinement evidence:21 unit tests, lint, TypeScript, production build and diff checks passed. Live SDD article shows exactly its5 H2 links while13 H3 anchors remain present. Graphify refreshed749 nodes/977 edges with same label warning. Local preview restarted3000.
