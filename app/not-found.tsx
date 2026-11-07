import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
   return (
      <div id="top" className="blog-shell">
         <a className="skip-link" href="#main-content">
            Skip to content
         </a>
         <Header />
         <main
            id="main-content"
            tabIndex={-1}
            className="blog-main blog-not-found content-width"
         >
            <h1>Page not found.</h1>
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
         <Footer topHref="#top" />
      </div>
   );
}
