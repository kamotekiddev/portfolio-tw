import assert from "node:assert/strict";
import test from "node:test";
import remarkParse from "remark-parse";
import type { Root } from "mdast";
import { unified } from "unified";
import { getArticleHeadings, getArticleSections, remarkArticleHeadings } from "../app/data/article-headings";

test("extracts readable formatted heading names, all levels, and document order", () => {
  const body = "## A **bold** [link](https://example.com) with `code` ![diagram](/diagram.png)\n### Child\n#### Deep\n##### Deeper\n###### Last";
  assert.deepEqual(getArticleHeadings(body), [
    { id: "section-a-bold-link-with-code-diagram", text: "A bold link with code diagram", level: 2 },
    { id: "section-child", text: "Child", level: 3 },
    { id: "section-deep", text: "Deep", level: 4 },
    { id: "section-deeper", text: "Deeper", level: 5 },
    { id: "section-last", text: "Last", level: 6 },
  ]);
});

test("allocates unique IDs even when an authored suffix collides with a duplicate", () => {
  const body = "## Repeat\n## Repeat\n## Repeat-2\n## Repeat\n## !!!\n## ???";
  assert.deepEqual(getArticleHeadings(body).map(({ id }) => id), [
    "section-repeat", "section-repeat-2", "section-repeat-2-2", "section-repeat-3", "section-section", "section-section-2",
  ]);
  assert.deepEqual(getArticleHeadings(body), getArticleHeadings(body));
});

test("normalizes Unicode consistently and retains non-Latin section names", () => {
  assert.deepEqual(getArticleHeadings("## Cafe\u0301\n## Café\n## 日本語の見出し\n## مرحبا").map(({ id }) => id), [
    "section-café", "section-café-2", "section-日本語の見出し", "section-مرحبا",
  ]);
});

test("ignores fenced code and does not generate navigation without body headings", () => {
  assert.deepEqual(getArticleHeadings("# Title\n\nPlain text\n\n```md\n## Not a section\n```"), []);
});

test("remark rendering receives exactly the IDs and focus targets used by extraction", () => {
  const body = "## **Repeat**\n### Child\n## Repeat\n## !!!\n## 日本語\n";
  const processor = unified().use(remarkParse).use(remarkArticleHeadings);
  const root = processor.runSync(processor.parse(body)) as Root;
  const headings = root.children.filter((node) => node.type === "heading");
  assert.deepEqual(headings.map((node) => node.data?.hProperties?.id), getArticleHeadings(body).map(({ id }) => id));
  for (const node of headings) assert.equal(node.data?.hProperties?.tabIndex, -1);
});

test("navigation includes only high-level H2 sections while keeping all heading anchors", () => {
  const body = "## Parent\n### Child\n#### Deep\n## Parent\n### Last";
  assert.deepEqual(getArticleSections(body), [
    { id: "section-parent", text: "Parent", level: 2 },
    { id: "section-parent-2", text: "Parent", level: 2 },
  ]);
  assert.equal(getArticleHeadings(body).length, 5);
  assert.deepEqual(getArticleSections("### Child only"), []);
});
