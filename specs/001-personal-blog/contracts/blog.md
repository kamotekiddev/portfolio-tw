# Blog Contracts

## Public Routes

| Address | Result |
|---|---|
| `/blog` | 200; published summaries newest first (date descending, slug ascending for ties), or honest empty state with portfolio navigation |
| `/blog/<published-slug>` | 200; complete article with title, publication date, optional topics, semantic body and return-to-blog link |
| `/blog/<draft-or-unknown-slug>` | HTTP 404; generic not-found page linking to `/blog` and `/`, with no draft metadata or content |

Use `generateStaticParams` for published slugs and `dynamicParams = false` to make unknown/draft paths genuine 404s. Metadata and page lookups also call the published selector defensively. Verify HTTP status before streaming; do not accept a visually correct not-found page with status 200.

## Content and Metadata

Input fields and lifecycle follow [data-model.md](../data-model.md). Articles support paragraphs, H2–H6 headings, ordered/unordered lists, links, images with alt text, inline code and fenced/indented whitespace-preserving code blocks. Require the exact non-executable JSON envelope from the data model before parsing. Use react-markdown with `skipHtml` and its default safe URL transformation; no MDX or arbitrary JavaScript. Validate image alt text and restrict link/image schemes to safe web or relative destinations, with mailto permitted for links. Published images use author-supplied URLs or published assets. Do not add syntax highlighting or interactive article components in this scope.

Every published article exposes its own title, summary description, canonical `/blog/<slug>`, Open Graph article fields and Twitter title/description. Reuse `/social-preview` as the existing fallback image. Origin precedence: `NEXT_PUBLIC_SITE_URL`, then HTTPS `VERCEL_PROJECT_PRODUCTION_URL`, then `http://localhost:3000`. `/blog` uses blog-specific title/description and canonical. Any discovery surface added or already present must use the published selector. No new sitemap or feed is required by this feature.

## Navigation and Presentation

Home exposes Blog. Shared section links resolve to portfolio sections from every route. Blog and articles expose portfolio navigation; articles link back to the index. All anchors and full article bodies work without scripts. Root theme behavior, skip link, visible keyboard focus and reduced-motion preferences remain available. Code blocks scroll inside their container; long links and titles wrap. Images fit the content width. Semantic time elements carry valid date-only values. No optional empty topic or image containers.

## Build Boundary

`npm run build` invokes content validation before Next's build (via `prebuild` or an equivalent explicit command). A nonzero validation exit prevents publishing. Validate all entries including drafts and report source/field-specific errors. No directory means an empty valid blog. Filesystem code and raw drafts must not enter client chunks, public assets, route output, or public metadata. Build-internal private server files are not public routes; inspect actual publicly served surfaces in regression checks.
