import "server-only";
import {
  loadBlogPosts,
  selectPublishedPost,
  selectPublishedPosts,
  summarizePost,
} from "../../scripts/blog-content";
import type { BlogPost, BlogPostSummary } from "../types/blog";

export function getPublishedPosts(): BlogPostSummary[] {
  return selectPublishedPosts(loadBlogPosts()).map(summarizePost);
}

export function getPublishedPostBySlug(slug: string): BlogPost | undefined {
  return selectPublishedPost(loadBlogPosts(), slug);
}
