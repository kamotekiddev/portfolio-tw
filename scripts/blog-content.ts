import { lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { BlogPost, BlogPostSummary } from "../app/types/blog";

export const DEFAULT_BLOG_DIRECTORY = path.join(process.cwd(), "app", "data", "blog");
const metadataKeys = new Set(["title", "slug", "summary", "publishedAt", "status", "topics"]);
const markdownParser = unified().use(remarkParse);

export class BlogContentError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`Blog content validation failed:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
    this.name = "BlogContentError";
    this.problems = problems;
  }
}

type MarkdownNode = {
  type: string;
  children?: MarkdownNode[];
  depth?: number;
  alt?: string | null;
  url?: string;
  identifier?: string;
  position?: { start?: { line?: number } };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

function validDestination(url: string, isImage: boolean): boolean {
  if (!url || /[\u0000-\u0020\u007f\\]/.test(url)) return false;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1].toLowerCase();
  if (!scheme) return true;
  if (scheme === "mailto") return !isImage;
  if (scheme !== "http" && scheme !== "https") return false;
  try {
    const parsed = new URL(url);
    return Boolean(parsed.hostname) && /^https?:\/\//i.test(url);
  } catch {
    return false;
  }
}

function validateMarkdown(body: string, sourcePath: string): string[] {
  const root = markdownParser.parse(body) as MarkdownNode;
  const problems: string[] = [];
  const definitions = new Map<string, MarkdownNode>();
  const visit = (node: MarkdownNode, action: (node: MarkdownNode) => void): void => {
    action(node);
    node.children?.forEach((child) => visit(child, action));
  };
  const diagnostic = (node: MarkdownNode, problem: string) => {
    const line = node.position?.start?.line;
    problems.push(`${sourcePath}: body${line ? ` (Markdown line ${line})` : ""}: ${problem}`);
  };
  visit(root, (node) => {
    if (node.type === "definition" && node.identifier && !definitions.has(node.identifier)) {
      definitions.set(node.identifier, node);
    }
  });
  let previousHeading: number | undefined;
  visit(root, (node) => {
    if (node.type === "heading" && typeof node.depth === "number") {
      if (previousHeading === undefined && node.depth !== 2) {
        diagnostic(node, "the first body heading must be H2; the article title supplies H1");
      } else if (node.depth < 2 || (previousHeading !== undefined && node.depth > previousHeading + 1)) {
        diagnostic(node, "heading hierarchy must use H2–H6 without skipping a deeper level");
      }
      previousHeading = node.depth;
    }
    const isImage = node.type === "image" || node.type === "imageReference";
    const isLink = node.type === "link" || node.type === "linkReference";
    if (isImage && (typeof node.alt !== "string" || !node.alt.trim())) {
      diagnostic(node, "images require nonempty alternative (alt) text");
    }
    if (isImage || isLink || node.type === "definition") {
      const reference = node.type === "imageReference" || node.type === "linkReference";
      const destination = reference ? definitions.get(node.identifier ?? "")?.url : node.url;
      if (!destination || !validDestination(destination, isImage)) {
        diagnostic(node, "URL destination must use http/https or a relative destination; mailto is allowed only for links");
      }
    }
  });
  return problems;
}

/** Parse one non-executable post and validate its complete authoring contract. */
export function parseBlogPost(source: string, sourcePath: string): BlogPost {
  const normalized = source.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0] !== "---json") {
    throw new BlogContentError([`${sourcePath}: frontmatter opening line must be exactly ---json`]);
  }
  const closingIndex = lines.indexOf("---", 1);
  if (closingIndex === -1) {
    throw new BlogContentError([`${sourcePath}: frontmatter requires an exact --- closing line`]);
  }
  let metadata: unknown;
  try {
    metadata = JSON.parse(lines.slice(1, closingIndex).join("\n"));
  } catch {
    throw new BlogContentError([`${sourcePath}: frontmatter must contain valid JSON`]);
  }
  if (!isRecord(metadata)) {
    throw new BlogContentError([`${sourcePath}: frontmatter must contain a JSON object`]);
  }
  // Prechecks above run before gray-matter, whose opening suffix can select an engine.
  // Only a validated JSON envelope is ever passed to it.
  const { content: body } = matter(normalized, { language: "json" });
  const fields = metadata;
  const problems: string[] = [];
  const stringField = (key: string): string => {
    const value = fields[key];
    if (typeof value !== "string" || !value.trim()) {
      problems.push(`${sourcePath}: ${key} must be a nonempty string`);
      return "";
    }
    return value.trim();
  };
  for (const key of Object.keys(fields)) {
    if (!metadataKeys.has(key)) problems.push(`${sourcePath}: unsupported metadata field ${key}`);
  }
  const title = stringField("title");
  const slug = stringField("slug");
  const summary = stringField("summary");
  const publishedAt = stringField("publishedAt");
  const status = stringField("status");
  if (slug && (fields.slug !== slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {
    problems.push(`${sourcePath}: slug must contain lowercase ASCII words separated by single hyphens`);
  }
  if (publishedAt && (fields.publishedAt !== publishedAt || !isCalendarDate(publishedAt))) {
    problems.push(`${sourcePath}: publishedAt must be a real calendar date in YYYY-MM-DD format`);
  }
  if (fields.status !== "draft" && fields.status !== "published") {
    problems.push(`${sourcePath}: status must be exactly draft or published`);
  }
  let topics: string[] | undefined;
  if (Object.prototype.hasOwnProperty.call(fields, "topics")) {
    if (!Array.isArray(fields.topics) || fields.topics.some((topic) => typeof topic !== "string" || !topic.trim())) {
      problems.push(`${sourcePath}: topics must be an array of nonempty strings when supplied`);
    } else {
      topics = Array.from(new Set((fields.topics as string[]).map((topic) => topic.trim())));
    }
  }
  if (!body.trim()) problems.push(`${sourcePath}: body must be nonempty Markdown`);
  else problems.push(...validateMarkdown(body, sourcePath));
  if (problems.length) throw new BlogContentError(problems);
  return {
    title, slug, summary, publishedAt,
    status: status as BlogPost["status"],
    body,
    ...(topics !== undefined ? { topics } : {}),
  };
}

/** Read every draft and published source before making any public selection. */
export function loadBlogPosts(directory = DEFAULT_BLOG_DIRECTORY): BlogPost[] {
  let names: string[];
  try {
    names = readdirSync(directory).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new BlogContentError([`${directory}: unable to read blog content directory`]);
  }
  const problems: string[] = [];
  const posts: BlogPost[] = [];
  const slugSources = new Map<string, string>();
  for (const name of names.filter((filename) => filename.endsWith(".md"))) {
    const sourcePath = path.join(directory, name);
    try {
      if (!lstatSync(sourcePath).isFile()) {
        problems.push(`${sourcePath}: blog source must be a regular readable Markdown file`);
        continue;
      }
      const post = parseBlogPost(readFileSync(sourcePath, "utf8"), sourcePath);
      const firstSource = slugSources.get(post.slug);
      if (firstSource) problems.push(`${sourcePath}: slug duplicates the identifier in ${firstSource}`);
      else slugSources.set(post.slug, sourcePath);
      posts.push(post);
    } catch (error) {
      if (error instanceof BlogContentError) problems.push(...error.problems);
      else problems.push(`${sourcePath}: unable to read Markdown source`);
    }
  }
  if (problems.length) throw new BlogContentError(problems);
  return posts;
}

export function selectPublishedPosts(posts: readonly BlogPost[]): BlogPost[] {
  return posts.filter((post) => post.status === "published").sort((a, b) => {
    if (a.publishedAt !== b.publishedAt) return a.publishedAt > b.publishedAt ? -1 : 1;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
}

export function selectPublishedPost(posts: readonly BlogPost[], slug: string): BlogPost | undefined {
  return posts.find((post) => post.status === "published" && post.slug === slug);
}

export function summarizePost(post: BlogPost): BlogPostSummary {
  const { title, slug, summary, publishedAt, topics } = post;
  return { title, slug, summary, publishedAt, ...(topics !== undefined ? { topics: [...topics] } : {}) };
}
