import Link from "next/link";
export default function BlogNotFound() {
   return (
      <main
         id="main-content"
         tabIndex={-1}
         className="blog-main blog-not-found content-width"
      >
         <h1>Entry not found.</h1>
         <p>The page you’re looking for isn’t available.</p>
         <div className="blog-not-found-links">
            <Link className="text-link" href="/blog">
               Back to blog
            </Link>
            <Link className="text-link" href="/">
               Back to portfolio
            </Link>
         </div>
      </main>
   );
}
