import React, { ReactNode } from "react";

import Button from "@/components/Button";
import Footer from "@/components/Footer";
import Link from "next/link";

interface Props {
   children: ReactNode;
}
const Layout = ({ children }: Props) => {
   return (
      <main>
         <header className="sticky top-0 z-[1000] bg-black-primary">
            <div className="mx-auto max-w-7xl p-4">
               <Link href="/">
                  <Button variant="outline" size="medium">
                     Go back
                  </Button>
               </Link>
            </div>
         </header>
         {children}
         <Footer />
      </main>
   );
};

export default Layout;
