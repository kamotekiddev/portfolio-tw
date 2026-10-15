import { contactLinks } from "@/data/social-links";

export default function Footer() {
   return (
      <footer className="site-footer content-width">
         <a href="#home" className="footer-wordmark">
            kamote.dev
         </a>
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
               <a href="#home">Back to top ↑</a>
            </div>
         </div>
      </footer>
   );
}
