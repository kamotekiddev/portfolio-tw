import { FiArrowUpRight } from "react-icons/fi";
import Link from "next/link";
import { getPublishedPosts } from "@/data/blog";
import PostMeta from "./components/PostMeta";
import { blogMetadata } from "./metadata";

export const metadata = blogMetadata({
   title: "Blog — Joshua Dela Cruz",
   description:
      "Notes on learning, building projects, and working through engineering problems by Joshua Dela Cruz.",
   path: "/blog",
});

export default function BlogPage() {
   const posts = getPublishedPosts();

   return (
      <main
         id="main-content"
         tabIndex={-1}
         className="blog-main blog-index content-width"
      >
         <header className="blog-intro">
            <h1>Blog</h1>
            <p>
               What I’m learning, how I build my projects, and the problems I work
               through along the way.
            </p>
         </header>
         {posts.length > 0 ? (
            <ul className="blog-post-list">
               {posts.map((post) => (
                  <li key={post.slug}>
                     <article className="blog-post-card">
                        <PostMeta
                           publishedAt={post.publishedAt}
                           topics={post.topics}
                        />
                        <div className="blog-post-preview">
                           <h2>
                              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                           </h2>
                           <p>{post.summary}</p>
                        </div>
                     </article>
                  </li>
               ))}
            </ul>
         ) : (
            <section className="blog-empty" aria-labelledby="empty-blog-title">
               <h2 id="empty-blog-title">No published entries yet.</h2>
               <p>This is where I’ll share my writing as it’s ready.</p>
               <Link className="text-link" href="/">
                  Back to portfolio <FiArrowUpRight aria-hidden="true" focusable="false" />
               </Link>
            </section>
         )}
      </main>
   );
}
