# Implementation Plan: Personal Engineering Blog

**Branch**: `codex/001-personal-blog` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: `specs/001-personal-blog/spec.md`

## Summary

Add a repository-authored, single-author blog at `/blog` and `/blog/[slug]`. Store Markdown separately from presentation, validate every entry before production builds, and server-render only published content. Preserve the Geist, charcoal/emerald, dark-default design and persistent light theme. Ship an honest empty state until the owner supplies writing.

Branch setup completed on 2026-11-07: fetched `origin`, confirmed its remote default is `main`, and created `codex/001-personal-blog` directly from `origin/main` at `b2678173cd985ff6d9b90ade17336e40af5ed9e9`. Existing feature artifacts were preserved. The branch prerequisite is satisfied; implementation and verification are complete, with evidence in [tasks.md](tasks.md).

## Technical Context

**Language/Version**: TypeScript 5.1.6, React 19.1.0, Next.js 15.3.8 App Router; use a supported local Node version verified during implementation.

**Primary Dependencies**: Existing Tailwind 4.1.10, next-themes, Geist, date-fns. Planned additions: gray-matter for metadata parsing, react-markdown for semantic Markdown rendering, unified and remark-parse for shared Markdown AST validation (headings, image alt text and URL schemes), server-only to enforce the server boundary. Dev-only tsx for running TypeScript validation and Node tests; Playwright for repeatable browser regression checks. Confirm compatible releases against the installed stack before installation and commit the lockfile. No CMS, database, MDX execution, or external content service.

**Storage**: `app/data/blog/*.md`, outside `public/`, with published images under `public/images/blog/`. Draft/private assets remain outside `public/` until intentionally published.

**Testing**: Node test runner via tsx for validation, sorting, and publication filtering; Playwright against a production server for route responses, metadata, draft leakage, themes, responsive layout, keyboard use, and no-JavaScript reading. Required lint, TypeScript, and production build checks.

**Target Platform**: Existing Next.js deployment; server-rendered/static-generated HTML with no client content fetch.

**Project Type**: Existing portfolio web application.

**Performance Goals**: No Markdown parser or filesystem loader in browser bundles; reuse existing shell and fonts; no additional client interaction required for reading. No new numeric latency target is introduced.

**Constraints**: Draft titles, summaries, bodies and unpublished assets must not be publicly served; validation includes drafts. All public consumers share the same published selector. Preserve no-script reading, both themes, reduced motion, and responsive accessibility.

**Scale/Scope**: One author, index and article routes, optional topic labels, basic article metadata, authoring guide. No search, topic routes, comments, feeds, accounts, scheduling, or fabricated launch posts.

## Constitution Check

Pre-research and post-design gates both PASS:

- I — FR-001–FR-013 and SC-001–SC-006 govern this bounded plan. Tasks and analysis follow before application edits.
- II — No invented posts ship. Fixtures are clearly marked test data, isolated from production content. Public images require supplied provenance and alternative text.
- III — Content is server-rendered; semantic navigation, focus, themes, reduced motion, code overflow and no-script behavior have explicit verification scenarios.
- IV — Keep App Router, shared styling in `app/globals.css`, content in `app/data/`, and shared types in `app/types/`. Parsing/rendering dependencies implement FR-008 without creating a bespoke Markdown parser. Test dependencies enable meaningful behavior verification.
- V — Validation errors, draft isolation, route responses and metadata get regression coverage. Browser matrix is 375/768/1440 pixels in both themes; lint, TypeScript, build and Graphify refresh are implementation gates.

No constitutional exceptions. Research decisions are in [research.md](research.md). No unresolved product clarification blocks planning.

## Project Structure

### Documentation (this feature)

```text
specs/001-personal-blog/
  spec.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  contracts/blog.md
  checklists/requirements.md
  tasks.md                    # generated implementation work and evidence
```

### Planned Source Code (repository root)

```text
app/
  not-found.tsx               # framework-level 404 public navigation fallback
  (root)/blog/
    layout.tsx                # blog shell, skip link, shared header/footer
    page.tsx                  # published index / empty state
    [slug]/page.tsx            # article, metadata, missing/draft notFound
    not-found.tsx             # navigation back to public content
    metadata.ts              # shared origin/social metadata helper
    components/PostMeta.tsx  # UTC dates and optional topics
    components/ArticleBody.tsx # server-rendered Markdown
  components/Header.tsx       # Blog link; home anchors work across routes
  components/Logo.tsx         # home destination works across routes
  components/Footer.tsx       # home navigation works across routes
  data/blog.ts                # server-only filesystem adapter
  data/blog/*.md              # owner-authored content, initially empty
  types/blog.ts               # validated metadata and post types
  globals.css                 # blog typography and responsive rules
scripts/
  validate-blog.ts            # prebuild entry point
  blog-content.ts             # pure parsing/validation/selectors shared by CLI/adapter/tests
tests/
  blog-content.test.ts
  blog-fixtures.ts            # isolated source/build/server lifecycle
  blog.spec.ts
public/images/blog/           # only intentionally published assets, when supplied
docs/blog-authoring.md
playwright.config.ts
package.json                  # validation/test scripts and dependencies
package-lock.json
```

**Structure Decision**: Add the blog beside the home route group, not inside its entrance-motion shell. Reuse shared Header/Footer with root-qualified section links (`/#work`, etc.) and Logo home destination so links work from articles. Keep local footer back-to-top separate from its portfolio link. The blog shell provides its own main-content and top anchors. Reuse root theme provider and metadata origin precedence; derive canonicals from the same precedence without changing existing metadata behavior. Server-only adapter wraps a pure shared content core so tests and CLI can exercise validation without importing the server-only guard. Do not create directories solely for empty future content; add them when needed.

## Implementation Sequence and Acceptance Mapping

1. Branch setup is complete as recorded above. Confirm baseline checks, then add dependencies and pure content validation plus server-only adapter (FR-001–004, FR-006–007).
2. Add index, article rendering, not-found handling and per-article metadata through the shared published selector (FR-004, FR-006–008, FR-011–012).
3. Integrate navigation and blog styling with the existing shell, themes, keyboard and no-script experience (FR-005, FR-009–010).
4. Document authoring and publishing, preserve the empty launch state, and add isolated fixtures and regression coverage (FR-001, FR-003–004, FR-013).
5. Execute [quickstart.md](quickstart.md), record acceptance evidence in tasks, run required checks and refresh Graphify after code changes. Update the project structure rules to reflect implemented paths.

## Complexity Tracking

No violations requiring justification. Planned dependencies and file boundaries are scoped to the content pipeline and its verification.

## Planning Verification

This phase changes documentation and feature context only. Application checks and browser acceptance have not been run. Atlas reviewed the design artifacts with no critical inconsistencies. Local artifact links and unresolved-placeholder checks passed. No extension hook configuration exists in this checkout. `tasks.md` has been generated and `$speckit-analyze` completed with no critical/high issues. Implementation is complete; all30 tasks and verification evidence are recorded in `tasks.md`.

## Implementation Adjustments

- Added `app/not-found.tsx` because production verification showed unknown slugs with `dynamicParams = false` use the framework-level fallback instead of the nested blog not-found component. The generic fallback preserves HTTP404 and links to `/blog` and `/` without distinguishing drafts. This satisfies FR-011 without runtime route generation.
- `app/(root)/blog/metadata.ts` and `components/PostMeta.tsx` share metadata-origin handling and UTC-stable dates/topic presentation across list and articles.
- Markdown heading rules are explicit in the data model: headings optional, first H2, deepen at most one level, repeat/return allowed, no body H1.
- Isolated browser fixtures rebuild an independent copied project through initial publication, stable revision, withdrawal and empty-state transitions; real source content and root build stay clean.
