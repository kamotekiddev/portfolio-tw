import Link from "next/link";
import { contactLinks } from "@/data/social-links";

export default function Footer({ topHref = "#home" }: { topHref?: string }) {
   return (
      <footer className="site-footer content-width">
         <Link href="/" className="footer-wordmark">
            kamote.dev
         </Link>
         <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Joshua Dela Cruz</p>
            <div className="footer-links">
               <a
                  href={contactLinks.github}
                  target="_blank"
                  rel="noopener noreferrer"
               >
                  GitHub
               </a>
               <a
                  href={contactLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
               >
                  Facebook
               </a>
               <a href={topHref}>Back to top ↑</a>
            </div>
         </div>
      </footer>
   );
}
