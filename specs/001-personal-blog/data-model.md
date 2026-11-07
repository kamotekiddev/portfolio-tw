# Data Model: Personal Engineering Blog

## Blog Post

One UTF-8 `.md` file per post in `app/data/blog/`, with required metadata and a Markdown body. Parse metadata with gray-matter; use explicit JSON frontmatter to keep dates and statuses strings and avoid implicit YAML coercion. Require an exact `---json` opening line, a JSON object, and an exact `---` closing line before invoking gray-matter; reject other language suffixes (including JavaScript), missing delimiters, and malformed JSON. The authoring guide must include a copyable valid template. This precheck prevents parser language overrides from enabling executable frontmatter.

| Field | Type | Validation / behavior |
|---|---|---|
| title | string | Required; trimmed, nonempty |
| slug | string | Required; lowercase ASCII words separated by single hyphens; globally unique across drafts and published posts |
| summary | string | Required; trimmed, nonempty; used as page description |
| publishedAt | string | Required exact `YYYY-MM-DD`; real calendar date, tested without permissive Date rollover |
| status | enum | Exactly `draft` or `published`; never inferred from date |
| topics | string[] | Optional; each item trimmed and nonempty; duplicates normalized without reordering |
| body | Markdown string | Required, nonempty; supports FR-008 elements |

Source path is internal diagnostic context, never a public URL. Article URLs derive only from validated slug. One H1 comes from title; body headings start at H2 and preserve hierarchy. Heading-free bodies are valid. The first heading must be H2; a following heading may deepen by at most one level (H2 → H3 is valid, H2 → H4 is rejected), repeat its level, or return to any earlier body level H2–H6. H1 is reserved for the article title. Images require meaningful nonempty alt text; enforce the supported authoring contract during validation using the Markdown AST (unified/remark-parse), including reference-style images/links. Validate heading hierarchy and URL schemes on that same tree; do not approximate Markdown with regular expressions. Invalid metadata, Markdown image contracts, empty body, duplicate slugs and unreadable files fail publishing with filename and field/problem. Aggregate errors where possible so authors can correct one publishing attempt. Reject unsupported metadata keys to surface typos rather than silently dropping status/date fields.

## Topic

An inline optional label, no independent identity, page, filtering, or relationship table. Render no topic container when absent.

## Publication Lifecycle

- Creation: author creates a valid draft. Drafts are validated but absent from public selectors, static params, article metadata and direct routes.
- Publication: explicit status change to published and site rebuild/release makes the entry public. Future published dates remain public.
- Revision: changing title, summary or body preserves the URL when slug is unchanged. No automatic redirects or slug renames.
- Withdrawal: changing published to draft and rebuilding removes the public route; verify prior cached output is replaced by the normal deployment workflow.
- Sorting: descending `publishedAt`, then ascending ASCII slug. Date-only values use UTC date semantics for display; avoid browser/local-time day shifts.

## Data Boundaries

Pure validation consumes all source entries; server-only adapter exposes published summaries and published lookup to pages. Index summaries exclude bodies. Route generation and metadata use the same published set; unknown and draft slugs yield notFound without draft-specific messages. No raw source downloads, client imports, runtime CMS, or draft preview route. Draft review is local editor review; to preview rendered content, temporarily publish only in a local working copy and revert status before release. Never publish a preview deployment containing temporary private content.

Draft-only assets stay outside publicly served directories. No article fixtures or sample experiences remain in production content after verification.
