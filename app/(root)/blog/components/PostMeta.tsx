import type { BlogPostSummary } from "@/types/blog";

export default function PostMeta({
   publishedAt,
   topics,
}: Pick<BlogPostSummary, "publishedAt" | "topics">) {
   const date = new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
   }).format(new Date(`${publishedAt}T00:00:00.000Z`));

   return (
      <div className="blog-post-meta">
         <time dateTime={publishedAt}>{date}</time>
         {topics && topics.length > 0 && (
            <ul className="blog-topics" aria-label="Topics">
               {topics.map((topic) => (
                  <li key={topic}>{topic}</li>
               ))}
            </ul>
         )}
      </div>
   );
}
