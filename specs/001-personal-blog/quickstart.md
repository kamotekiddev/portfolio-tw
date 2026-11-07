# Blog Validation Quickstart

The blog commands, routes and regression checks are implemented. Use this guide for acceptance verification; current results are recorded in `tasks.md`.

## Prerequisites

Use `codex/001-personal-blog`, created on 2026-11-07 from the freshly fetched remote default `origin/main` at `b2678173cd985ff6d9b90ade17336e40af5ed9e9`. Feature artifacts were preserved; branch setup is complete. Install with the repository lockfile (`npm ci`). Use a Node release supported by installed Next.js and the chosen test dependencies. Dependencies and scripts are recorded in the lockfile. Supply `NEXT_PUBLIC_SITE_URL=https://example.test` for predictable metadata assertions.

## Authoring and Launch State (SC-001)

Follow `docs/blog-authoring.md` to add an already-written valid draft, preview it locally, mark published, build/release and revise without changing slug. Time the process: publishing an already-written post should take at most ten minutes without presentation edits. Confirm the guide documents safe local-only rendered preview and draft asset handling. Production starts with no posts until the owner supplies writing; verify an informative empty state without fabricated entries.

## Content Regression (SC-003, SC-006)

Run `npm run test:blog` Node tests with isolated fixture directories: three published posts, one draft, differing dates, a date tie, a published future date and optional-topic omissions. Assert deterministic ordering, stable slug across title/body edits, and absence of draft results from every public selector. Check missing fields, whitespace-only fields/body, duplicate slug across statuses, malformed slug, invalid calendar dates (including non-leap February 29), invalid status, malformed metadata, missing closing delimiters, alternate frontmatter suffixes such as `---js` (rejected before any evaluation), and missing image alt text. Every failure identifies its entry and problem. `npm run validate:blog` must succeed for valid sources and fail for invalid sources; `npm run build` must fail before publishing invalid content.

## Production Browser Checks (SC-002–SC-006)

Run `npm run test:blog:e2e` against a production build/server. Tests must inject clearly labeled fixtures into an isolated copy or temporary directory, restore content with guaranteed cleanup, and never overwrite real posts. Do not commit fixture posts as owner writing.

1. From home, follow Blog and open an article in at most two navigation actions. Test section links, logo, footer, article back link and skip link from nested routes.
2. Check index ordering, title/summary/date/topics and complete article semantics. Edit title/body with slug unchanged, rebuild and confirm the original URL shows the revision.
3. Request draft and unknown slugs directly and assert HTTP 404 plus public navigation. Search draft sentinel title, summary and body in public route HTML and RSC responses, client chunks, public assets and any discovery metadata. Include encoded/path edge requests and assert they cannot bypass lookup. Check that no raw `.md` source URL serves draft content.
4. Inspect each article's title, description, canonical, Open Graph and Twitter data at the configured origin. Check production-host fallback and localhost origin resolution independently.
5. At 375, 768 and 1440 pixels, in dark and light themes, inspect index and representative article with long title/link, lists, image, inline code and wide code block. Assert document width does not exceed viewport, code preserves whitespace and scrolls internally, images fit and all text remains legible.
6. Traverse links and theme control by keyboard with visible focus. Confirm theme choice persists on navigation and reload. Exercise reduced motion. Disable scripts in a fresh browser context; read the full article and navigate home → blog → article → blog/home.
7. Remove temporary posts/assets, rebuild and confirm the real empty launch state. Save browser evidence and test results in feature task completion notes.

## Required Final Checks

Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` after implementation. Run `git diff --check` and `graphify update .` after code changes. Record actual results, failures and unrun checks in `tasks.md`. If framework/tooling constraints prevent a command, resolve or explicitly record the blocker rather than claiming success.
