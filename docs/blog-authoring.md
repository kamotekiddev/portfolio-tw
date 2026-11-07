# Writing on the blog

Posts live in `app/data/blog/`, separate from page components. The directory may be absent until your first post. Only entries explicitly marked `published` appear at `/blog` and `/blog/<slug>` after the site is rebuilt and released. The site launches with an empty blog until you supply writing.

## Create a draft

Create a UTF-8 file such as `app/data/blog/my-first-entry.md`. Copy this template and replace the example values with your own writing:

````markdown
---json
{
  "title": "Your article title",
  "slug": "your-article-slug",
  "summary": "Your short description of this entry.",
  "publishedAt": "2026-11-07",
  "status": "draft",
  "topics": ["Learning"]
}
---

Your opening paragraph.

## What I learned

Explain your experience in your own words.

- A useful observation
- Another observation

### An example

Use `inline code` or a fenced code block:

```ts
const message = "Your example";
```

1. Describe the first step.
2. Describe the next step.

[Link text](https://example.com)

![Describe what your image shows](/images/blog/your-image.png)
````

Remove the image example until you have supplied the asset. The opening line must be exactly `---json`; the closing line must be exactly `---`. Metadata is JSON: use double quotes and no trailing commas. YAML, JavaScript frontmatter and executable MDX are unsupported. Keep one file per post.

Required fields are `title`, `slug`, `summary`, `publishedAt`, and `status`, followed by a nonempty Markdown body. Titles and summaries must be nonblank strings. Slugs use lowercase ASCII words separated by single hyphens and must be unique across drafts and published posts. Keep a slug unchanged to preserve the article URL. Dates must be real calendar dates in `YYYY-MM-DD` form. Status is exactly `draft` or `published`. Optional `topics` is an array of nonblank strings; duplicates are normalized in their original order. Omit topics when unnecessary. Unknown metadata keys cause errors so typos are visible.

The title supplies the page's H1. Body headings are optional; if present, start at H2 (`##`). Deepen one level at a time (H2 → H3), repeat a level, or return to an earlier level. H2 → H4 and body H1 are rejected. Paragraphs, lists, links, images with nonempty alternative text, inline code and fenced/indented code blocks are supported. Raw HTML is skipped. Link and image destinations must use supported web or relative URLs; mailto is permitted for links. Code blocks preserve whitespace and scroll within the article.

## Validate and preview

Run:

```sh
npm run validate:blog
npm run dev
```

Validation checks every entry, including drafts, and reports the file and problem. Draft addresses return 404 even locally; review drafts in your editor's Markdown preview. To check the actual page, temporarily mark only that entry `published` in your local working copy and visit `http://localhost:3000/blog/<slug>`. Return it to `draft` before committing or releasing if it is not ready. Do not deploy a local preview containing unpublished private material.

Put intentionally public images in `public/images/blog/` and refer to them with `/images/blog/<filename>`. Files under `public/` are public regardless of article status. Keep draft-only private assets outside `public/`; publish them deliberately with the article. Supply accurate alternative text and preserve asset provenance. External images must have a supplied, usable URL. Never use invented experiences as personal factual writing.

## Publish and revise

1. Finish the writing and validation, check links and images, and set `status` to `published`.
2. Run `npm run build`. Content validation runs before the Next.js build; fix any errors before releasing.
3. Use the repository's normal site release workflow. Writing appears only in the deployed build that contains the published status. No automatic deployment or git operation is performed by the blog tooling.
4. Open `/blog` and the article's permanent `/blog/<slug>` address to confirm the release.

A future date does not schedule a post: explicit `published` status makes it visible. Posts sort by publication date descending; ties use ASCII slug ascending. Dates display without timezone-dependent day shifts.

To revise, edit title, summary or body, keep the slug, validate, rebuild and release again. To withdraw, change status to `draft`, rebuild and release; verify the old public address now returns 404 and the list no longer includes it. Changing a slug deliberately changes its URL; automatic redirects are not provided.

## Check the feature

```sh
npm run test:blog
npm run test:blog:e2e
npm run lint
npx tsc --noEmit
npm run build
```

Browser verification uses synthetic entries in an isolated copy with separate build output and server. These entries are test data and do not become real portfolio writing. See `specs/001-personal-blog/quickstart.md` for the full acceptance scenarios.
