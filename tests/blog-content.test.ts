import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  BlogContentError,
  loadBlogPosts,
  parseBlogPost,
  selectPublishedPost,
  selectPublishedPosts,
  summarizePost,
} from "../scripts/blog-content";

const metadata = {
  title: "A supplied lesson",
  slug: "a-supplied-lesson",
  summary: "A supplied summary.",
  publishedAt: "2026-11-07",
  status: "published",
};
const source = (overrides: Record<string, unknown> = {}, body = "## Lesson\n\nWriting.") =>
  `---json\n${JSON.stringify({ ...metadata, ...overrides })}\n---\n${body}`;
const parse = (overrides: Record<string, unknown> = {}, body?: string) =>
  parseBlogPost(source(overrides, body), "lesson.md");
const rejects = (text: string, pattern: RegExp) =>
  assert.throws(() => parseBlogPost(text, "lesson.md"), (error: unknown) =>
    error instanceof BlogContentError && /lesson\.md/.test(error.message) && pattern.test(error.message));

function withDirectory(run: (directory: string) => void) {
  const directory = mkdtempSync(path.join(tmpdir(), "portfolio-blog-unit-"));
  try { run(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}

test("parses and normalizes valid fields, optional topics and CRLF", () => {
  const post = parse({ title: "  Lesson  ", topics: [" TypeScript ", "TypeScript", "Notes"] });
  assert.equal(post.title, "Lesson");
  assert.deepEqual(post.topics, ["TypeScript", "Notes"]);
  assert.equal(parseBlogPost(source().replaceAll("\n", "\r\n"), "windows.md").slug, metadata.slug);
  assert.equal(parse().topics, undefined);
});

test("requires a strict JSON object envelope before any language engine", () => {
  const globalState = globalThis as typeof globalThis & { blogEngineExecuted?: boolean };
  globalState.blogEngineExecuted = false;
  rejects('---javascript\n(globalThis.blogEngineExecuted = true, {})\n---\nBody', /opening/);
  assert.equal(globalState.blogEngineExecuted, false);
  delete globalState.blogEngineExecuted;
  for (const input of ["Body only", "---json \n{}\n---\nBody", "---js\n{}\n---\nBody"]) rejects(input, /opening/);
  rejects('---json\n{}\nBody', /closing/);
  rejects('---json\n{broken}\n---\nBody', /JSON/);
  rejects('---json\n[]\n---\nBody', /object/);
  rejects('---json\nnull\n---\nBody', /object/);
});

test("rejects unknown fields and every missing required metadata field", () => {
  rejects(source({ typo: true }), /typo/);
  for (const key of Object.keys(metadata)) {
    const fields: Record<string, unknown> = { ...metadata };
    delete fields[key];
    rejects(`---json\n${JSON.stringify(fields)}\n---\nBody`, new RegExp(key));
  }
});

test("rejects wrong types, whitespace strings, invalid slugs and statuses", () => {
  for (const key of ["title", "slug", "summary", "publishedAt", "status"]) {
    for (const value of [null, 3, true, {}, [], "  "]) rejects(source({ [key]: value }), new RegExp(key));
  }
  for (const slug of ["UPPER", "two--words", "-first", "last-", "../private", "with_under", "café", "has space", " padded "]) {
    rejects(source({ slug }), /slug/);
  }
  rejects(source({ status: "scheduled" }), /status/);
  rejects(source({ status: " published " }), /status/);
  rejects(source({}, " \n\t"), /body/);
});

test("accepts real dates and rejects rollover, format and nonleap dates", () => {
  for (const date of ["2024-02-29", "2000-02-29", "2026-12-31"]) assert.equal(parse({ publishedAt: date }).publishedAt, date);
  for (const date of ["2026-02-29", "1900-02-29", "2026-02-30", "2026-04-31", "2026-00-01", "2026-13-01", "2026-01-00", "2026-1-01", "2026-01-01T00:00:00Z", "0000-01-01", " 2026-01-01 "]) {
    rejects(source({ publishedAt: date }), /publishedAt/);
  }
});

test("validates optional topic values", () => {
  for (const topics of ["notes", null, [""], [" "], [5]]) rejects(source({ topics }), /topics/);
  assert.deepEqual(parse({ topics: [] }).topics, []);
});

test("allows heading-free writing and enforces exact heading hierarchy", () => {
  assert.doesNotThrow(() => parse({}, "Plain writing without headings."));
  assert.doesNotThrow(() => parse({}, "## First\n### Child\n#### Detail\n## Return\n### Another"));
  for (const body of ["# Body title", "### Starts too deep", "## First\n#### Skipped"]) rejects(source({}, body), /heading/);
});

test("supports required Markdown elements and safe link/image destinations", () => {
  assert.doesNotThrow(() => parse({}, [
    "## Lesson", "A paragraph with `inline code` and [a link](https://example.com).", "1. First\n2. Second", "- Item",
    "![Diagram](/images/diagram.png)", "[Email](mailto:owner@example.com)", "[Section](#lesson)", "[Relative](../notes)",
    "```ts\n  const preserved = true;\n```", "    indented code",
  ].join("\n\n")));
});

test("rejects empty image alt text and unsafe schemes including reference syntax", () => {
  for (const body of ["![](/image.png)", "![ ](/image.png)", "![][diagram]\n\n[diagram]: /image.png"]) rejects(source({}, body), /alt/);
  for (const body of ["[Unsafe](javascript:alert%281%29)", "![Image](data:image/png;base64,abc)", "![Image](mailto:owner@example.com)", "[Unsafe][ref]\n\n[ref]: javascript:alert%281%29", "![Image][ref]\n\n[ref]: mailto:owner@example.com"]) rejects(source({}, body), /URL|destination/);
  assert.doesNotThrow(() => parse({}, "![Diagram][image]\n\n[image]: /image.png\n\n[Safe][link]\n\n[link]: https://example.com"));
});

test("loads all entries and publishes in date-descending ASCII-slug order", () => {
  withDirectory((directory) => {
    const entries = [
      ["z.md", { slug: "zeta", publishedAt: "2025-01-01" }],
      ["a.md", { slug: "alpha", publishedAt: "2025-01-01" }],
      ["future.md", { slug: "future", publishedAt: "2099-01-01" }],
      ["private.md", { slug: "private", status: "draft", title: "DRAFT_SENTINEL" }],
    ] as const;
    for (const [name, values] of entries) writeFileSync(path.join(directory, name), source(values));
    const all = loadBlogPosts(directory);
    const published = selectPublishedPosts(all);
    assert.equal(all.length, 4);
    assert.deepEqual(published.map((post) => post.slug), ["future", "alpha", "zeta"]);
    assert.equal(selectPublishedPost(all, "private"), undefined);
    for (const slug of ["unknown", "../private", "%2e%2e%2fprivate"]) assert.equal(selectPublishedPost(all, slug), undefined);
    assert.equal(selectPublishedPost(all, "alpha")?.title, metadata.title);
    const summary = summarizePost(published[0]);
    assert.equal("body" in summary, false);
    assert.equal("status" in summary, false);
    assert.equal("sourcePath" in summary, false);
  });
});

test("validates drafts and reports errors across the full collection", () => {
  withDirectory((directory) => {
    writeFileSync(path.join(directory, "draft.md"), source({ status: "draft", publishedAt: "invalid" }));
    writeFileSync(path.join(directory, "broken.md"), source({ title: "" }));
    assert.throws(() => loadBlogPosts(directory), (error: unknown) => error instanceof BlogContentError && /draft\.md.*publishedAt/s.test(error.message) && /broken\.md.*title/s.test(error.message));
  });
});

test("rejects duplicate identifiers across published posts and drafts", () => {
  withDirectory((directory) => {
    writeFileSync(path.join(directory, "one.md"), source());
    writeFileSync(path.join(directory, "two.md"), source({ status: "draft" }));
    assert.throws(() => loadBlogPosts(directory), /two\.md.*slug.*one\.md/s);
  });
});

test("absent and empty directories are valid; unreadable sources fail clearly", () => {
  withDirectory((directory) => {
    assert.deepEqual(loadBlogPosts(path.join(directory, "missing")), []);
    assert.deepEqual(loadBlogPosts(directory), []);
    mkdirSync(path.join(directory, "not-a-file.md"));
    assert.throws(() => loadBlogPosts(directory), /not-a-file\.md.*read|not-a-file\.md.*regular/s);
  });
});

test("a title/body revision preserves the slug and reflects revised content", () => {
  const revised = parse({ title: "Revised title" }, "## Revised\n\nUpdated supplied content.");
  assert.equal(revised.slug, metadata.slug);
  assert.equal(revised.title, "Revised title");
  assert.match(revised.body, /Updated supplied content/);
});


test("validation CLI exits nonzero for invalid drafts and accepts empty/valid collections", () => {
  const cli = path.resolve("scripts/validate-blog.ts");
  const loader = createRequire(path.resolve("package.json")).resolve("tsx");
  withDirectory((directory) => {
    const runCli = () => spawnSync(process.execPath, ["--import", loader, cli], {
      cwd: directory,
      encoding: "utf8",
    });
    const empty = runCli();
    assert.equal(empty.error, undefined);
    assert.equal(empty.status, 0);
    assert.match(empty.stdout, /0 published, 0 draft/);
    const content = path.join(directory, "app", "data", "blog");
    mkdirSync(content, { recursive: true });
    writeFileSync(path.join(content, "published.md"), source());
    writeFileSync(path.join(content, "draft.md"), source({ slug: "private", status: "draft", publishedAt: "2026-02-30" }));
    const invalid = runCli();
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /draft\.md.*publishedAt/s);
    writeFileSync(path.join(content, "draft.md"), source({ slug: "private", status: "draft" }));
    const valid = runCli();
    assert.equal(valid.status, 0);
    assert.match(valid.stdout, /1 published, 1 draft/);
  });
});
