import { FiArrowLeft } from "react-icons/fi";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPostBySlug, getPublishedPosts } from "@/data/blog";
import { getArticleSections } from "@/data/article-headings";
import ArticleContents from "../components/ArticleContents";
import ArticleBody from "../components/ArticleBody";
import PostMeta from "../components/PostMeta";
import { blogMetadata } from "../metadata";

type ArticlePageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
   return getPublishedPosts().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
   params,
}: ArticlePageProps): Promise<Metadata> {
   const { slug } = await params;
   const post = getPublishedPostBySlug(slug);
   if (!post) notFound();

   return blogMetadata({
      title: post.title,
      description: post.summary,
      path: `/blog/${post.slug}`,
      publishedAt: post.publishedAt,
   });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
   const { slug } = await params;
   const post = getPublishedPostBySlug(slug);
   if (!post) notFound();

   const headings = getArticleSections(post.body);

   return (
      <main id="main-content" tabIndex={-1} className="blog-main content-width">
         <article className="blog-article">
            <Link className="text-link blog-back-link" href="/blog">
               <FiArrowLeft aria-hidden="true" focusable="false" /> Back to blog
            </Link>
            <header className="blog-article-header">
               <PostMeta
                  publishedAt={post.publishedAt}
                  topics={post.topics}
               />
               <h1>{post.title}</h1>
               <p className="blog-article-summary">{post.summary}</p>
            </header>
            <div className={headings.length ? "article-reading-layout" : undefined}>
               <ArticleContents headings={headings} />
               <ArticleBody body={post.body} />
            </div>
         </article>
      </main>
   );
}
