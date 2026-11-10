import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/data/blog";

export default function sitemap(): MetadataRoute.Sitemap {
   const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
         ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
         : "http://localhost:3000");
   const routes: MetadataRoute.Sitemap = [
      { url: new URL("/", origin).toString() },
      { url: new URL("/blog", origin).toString() },
   ];

   return [
      ...routes,
      ...getPublishedPosts().map((post) => ({
         url: new URL(`/blog/${post.slug}`, origin).toString(),
         lastModified: post.publishedAt,
      })),
   ];
}
