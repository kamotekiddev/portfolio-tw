# Research: Personal Engineering Blog

**Date**: 2026-11-07
**Scope**: Resolve authoring, rendering, publication, and verification choices for [spec.md](spec.md). These are design decisions; no application code or dependencies have been changed.

## 1. Repository-owned Markdown with explicit JSON front matter

**Decision**: Store `.md` posts outside `public/`, with a strict `---json` opening line, a JSON metadata object, and a `---` closing line. Use `gray-matter` to separate metadata from Markdown and its JSON parser for metadata. Validate the exact envelope before parsing; reject missing closing delimiters and any alternate language suffix. Do not enable JavaScript front matter or executable MDX.

**Rationale**: Owner-editable files meet FR-001 without an external service. JSON keeps dates as strings and provides unambiguous types. A maintained front-matter parser handles separation without requiring a custom Markdown parser. Importantly, gray-matter permits a delimiter language suffix to override its configured language and includes a JavaScript engine; merely passing `language: 'json'` is insufficient to enforce a non-executable format. The exact-envelope check is required before parser invocation.

**Alternatives considered**: YAML is friendlier for some authors but brings implicit date/type behavior that this small schema does not need. MDX adds executable components without a requirement. A CMS adds credentials, deployment integration, and services to a single-author repository workflow. A handwritten Markdown parser would duplicate established parsing behavior.

**Sources**: [gray-matter documentation](https://github.com/jonschlinkert/gray-matter), [JSON example](https://github.com/jonschlinkert/gray-matter/blob/master/examples/json.js), [language selection source](https://github.com/jonschlinkert/gray-matter/blob/master/index.js), [engine source](https://github.com/jonschlinkert/gray-matter/blob/master/lib/engines.js).

## 2. CommonMark rendered into server output

**Decision**: Use `react-markdown` in a Server Component with raw HTML disabled using `skipHtml`, retaining its default URL transformation. Use ordinary semantic paragraphs, headings, lists, links, images, and `pre`/`code`. The article title supplies the page's `h1`; authoring guidance requires body headings to begin at `h2`. Add only scoped styles for readable prose, wrapping links, responsive images, and horizontally scrollable code blocks. Use unified and remark-parse as direct dependencies for shared Markdown AST validation of heading hierarchy, image alternative text and URL schemes, including reference-style syntax, across drafts and published entries. This small parsing dependency supports the authoring contract without a regex-based Markdown validator. Syntax highlighting, GFM tables, and custom React embeds are deferred.

**Rationale**: CommonMark covers FR-008. Rendering React elements avoids a manually assembled HTML injection pipeline and keeps the complete article in the initial HTML. A Server Component does not require readers to run JavaScript. The library's default URL transformation and HTML policy must not be weakened by custom components or plugins.

**Alternatives considered**: A remark/rehype HTML pipeline adds several direct packages and HTML injection management. GFM, highlighting, and typography plugins add features absent from the spec. Client-side fetching would delay the content and break the no-JavaScript acceptance criteria.

**Sources**: [react-markdown documentation and security guidance](https://github.com/remarkjs/react-markdown), [Next.js 15 Server and Client Components](https://nextjs.org/docs/15/app/getting-started/server-and-client-components).

## 3. Validate every entry before filtering publication status

**Decision**: Implement a shared Node-compatible content reader and validator, with a thin `server-only` application entry point. The validation CLI and unit tests call the same core without importing the Next.js-only sentinel. Validate all entries, including drafts, before deriving published results. Require nonblank title, slug, summary, and body; explicit `draft` or `published`; a strict real calendar date in `YYYY-MM-DD`; and optional nonblank string topics. Detect duplicate slugs across the complete collection. Constrain slugs to safe lowercase ASCII words joined by hyphens, and retrieve articles by matching a validated collection entry rather than turning request parameters into filesystem paths. Report the file and failing field/rule.

**Rationale**: This creates one implementation of FR-002 and FR-003 shared by development, build validation, listing, metadata, and article generation. Validating only published content would allow malformed drafts to remain unnoticed until publishing. A strict calendar check rejects rollover dates such as February 30, which permissive date parsing can accept. Keeping framework integration separate allows Node's test runner and build scripts to exercise the real rules.

**Alternatives considered**: A schema library is unnecessary for this small, explicit schema unless implementation reveals a material benefit. Validation duplicated in routes would drift. A database and query layer add no value to repository-owned files.

## 4. Explicit publication and stable static routes

**Decision**: Use one published-post collection for the index, static route parameters, metadata, and article lookup. Sort by date descending, then slug ascending using deterministic ASCII comparison. Publication status alone controls visibility: future-dated published entries remain visible. Use `/blog` and `/blog/[slug]`; await the promise-based route parameters required by Next.js 15. Return published slugs from `generateStaticParams`, disable unlisted dynamic paths, and retain a published-only lookup that calls `notFound()` for unknown or draft slugs. Validate the full collection explicitly before `next build`, including when it has zero published entries.

**Rationale**: A stable slug decouples the address from title/body revisions. Filtering centrally avoids inconsistent public surfaces. `generateStaticParams` runs at build time; its published results define the public article set. Explicit prebuild validation also protects the empty-blog case. This design needs no scheduling, authenticated preview route, feed, or CMS.

**Draft boundary**: Source files remain outside publicly served assets and are never imported into a Client Component or serialized wholesale as props. Any list projection includes only published metadata. Unknown and draft paths expose the same public not-found behavior. Verification inspects HTTP responses, RSC responses, and public static assets for a unique draft marker; source files inside a private server deployment bundle are not public URLs. The authoring guide documents local review and publishing without exposing drafts through the public site. Assets placed in `public/` are public independently of post status; draft-only confidential material must not be put there.

**Alternatives considered**: Runtime route generation provides no benefit for content changed only through deployments. Date-based publication would create an unrequested scheduling feature. Public JSON or Markdown exports would create another draft exposure surface.

**Sources**: [Next.js 15 generateStaticParams](https://nextjs.org/docs/15/app/api-reference/functions/generate-static-params), [Next.js 15 notFound](https://nextjs.org/docs/15/app/api-reference/functions/not-found), [Next.js server-only boundary](https://nextjs.org/docs/15/app/getting-started/server-and-client-components#preventing-environment-poisoning).

## 5. Article metadata follows the existing origin policy

**Decision**: Generate each published article's title, description, and canonical URL from its validated metadata. Reuse the site's origin policy: `NEXT_PUBLIC_SITE_URL`, then `VERCEL_PROJECT_PRODUCTION_URL`, then the existing local fallback. Reuse the existing social-preview endpoint where appropriate; a new image-generation system is outside scope. Draft metadata is never returned by article lookup.

**Rationale**: This satisfies FR-012 without introducing a second site-origin policy or replacing existing portfolio metadata. Home, blog index, and article navigation remain ordinary links.

**Alternatives considered**: Hardcoded deployment URLs would break previews and local validation. Per-article generated artwork is not required and has no supplied assets.

## 6. Focused regression checks and production browser verification

**Decision**: Use Node's built-in test runner with `tsx` as a development-only TypeScript loader, keeping the repository's TypeScript content implementation available to unit tests and the validation CLI. Add Playwright as a development-only browser verification tool if no repository tool already serves that need. Verify against a production build with temporary fixture content: at least three published entries, one uniquely marked draft, and malformed cases. Keep fixtures outside production content by default; a documented test setup stages them temporarily and restores the original tree even after failure.

**Rationale**: Pure rule tests establish date validation, duplicate rejection, deterministic order, and explicit publication behavior. Production HTTP and browser checks establish route status, metadata, rendering, no-JavaScript navigation, and draft exclusion. Viewports at 375, 768, and 1440 pixels in both themes meet SC-004; check keyboard focus, long content, images, code overflow, and reduced motion. No fabricated personal post ships merely to make the UI nonempty.

**Required checks**: `npm run lint`, `npx tsc --noEmit`, and `npm run build`, plus targeted content tests and responsive browser scenarios. Record actual outcomes during implementation; research does not constitute passing application checks.

**Alternatives considered**: A full unit-testing framework is unnecessary alongside Node's runner. Unit tests alone cannot prove 404 responses, draft absence from browser output, or accessible responsive presentation. Manual browser checks alone make malformed publishing regressions difficult to repeat.

**Sources**: [Node.js test runner](https://nodejs.org/api/test.html), [tsx official repository](https://github.com/privatenumber/tsx), [Playwright projects](https://playwright.dev/docs/test-projects).

## Resolution

No unresolved technical clarification remains for this scope. Content format, parser boundaries, publishing rules, public routes, metadata, dependency rationale, and verification approach are selected. Phase 1 artifacts must preserve these decisions and map verification back to FR-001–FR-013 and SC-001–SC-006.
