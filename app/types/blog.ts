export type BlogPublicationStatus = "draft" | "published";

export interface BlogPostSummary {
  title: string;
  slug: string;
  summary: string;
  publishedAt: string;
  topics?: string[];
}

export interface BlogPost extends BlogPostSummary {
  status: BlogPublicationStatus;
  body: string;
}
