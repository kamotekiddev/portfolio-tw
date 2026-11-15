import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function BlogLayout({ children }: { children: ReactNode }) {
   return (
      <div id="top" className="blog-shell">
         <a className="skip-link" href="#main-content">
            Skip to content
         </a>
         <Header current="blog" />
         {children}
         <Footer topHref="#top" />
      </div>
   );
}
