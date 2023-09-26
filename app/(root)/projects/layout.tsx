import React, { ReactNode } from "react";

import Button from "@/components/Button";
import Footer from "@/components/Footer";
import Link from "next/link";
import DarkModeToggle from "@/components/DarkModeToggle";
import socialLinks from "@/data/social-links";
import IconButton from "@/components/IconButton";

interface Props {
   children: ReactNode;
}
const Layout = ({ children }: Props) => {
   return (
      <main className="bg-hero-bg-white dark:bg-hero-bg-dark">
         <header className="sticky top-0 z-[1000] backdrop-blur-lg">
            <div className="mx-auto flex max-w-5xl justify-between p-4">
               <Link href="/">
                  <Button variant="outline" size="medium">
                     Go back
                  </Button>
               </Link>
               <div className="space-x-2">
                  {socialLinks.map(({ icon, link }, i) => (
                     <a href={link} target="_black" key={i}>
                        <IconButton icon={icon} />
                     </a>
                  ))}
                  <DarkModeToggle />
               </div>
            </div>
         </header>
         {children}
         <Footer />
      </main>
   );
};

export default Layout;
