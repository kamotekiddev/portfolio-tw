import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Root, RootContent } from "mdast";

export type ArticleHeading = { id: string; text: string; level: number };

const parser = unified().use(remarkParse);

type TextNode = {
  type: string;
  value?: string;
  alt?: string | null;
  children?: TextNode[];
};

function headingText(node: TextNode): string {
  if (node.type === "text" || node.type === "inlineCode") return node.value ?? "";
  if (node.type === "image" || node.type === "imageReference") return node.alt ?? "";
  if (node.type === "break") return " ";
  return node.children?.map(headingText).join("") ?? "";
}

/** The same traversal produces the index and annotates rendered heading targets. */
function indexHeadings(root: Root): ArticleHeading[] {
  const headings: ArticleHeading[] = [];
  const used = new Set<string>();
  const visit = (node: Root | RootContent): void => {
    if (node.type === "heading" && node.depth >= 2 && node.depth <= 6) {
      const text = headingText(node).replace(/\s+/gu, " ").trim() || "Section";
      const slug = text.normalize("NFKC").toLowerCase()
        .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-").replace(/^-+|-+$/g, "") || "section";
      const base = `section-${slug}`;
      let id = base;
      let suffix = 2;
      while (used.has(id)) id = `${base}-${suffix++}`;
      used.add(id);
      node.data = {
        ...node.data,
        hProperties: { ...node.data?.hProperties, id, tabIndex: -1 },
      };
      headings.push({ id, text, level: node.depth });
    }
    if ("children" in node) node.children.forEach((child) => visit(child as RootContent));
  };
  visit(root);
  return headings;
}

export function getArticleHeadings(body: string): ArticleHeading[] {
  return indexHeadings(parser.parse(body));
}

/** High-level sections shown in article navigation; all headings retain anchors. */
export function getArticleSections(body: string): ArticleHeading[] {
  return getArticleHeadings(body).filter(({ level }) => level === 2);
}

/** Remark plugin applied by ReactMarkdown, sharing the index's exact ID rules. */
export function remarkArticleHeadings() {
  return (tree: Root): void => { indexHeadings(tree); };
}
