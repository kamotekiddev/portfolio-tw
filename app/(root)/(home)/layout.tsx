import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageMotion from "@/components/PageMotion";

export default function Layout({ children }: { children: ReactNode }) {
   return (
      <div id="home">
         <a className="skip-link" href="#main-content">
            Skip to content
         </a>
         <Header />
         {children}
         <Footer />
         <PageMotion />
      </div>
   );
}
