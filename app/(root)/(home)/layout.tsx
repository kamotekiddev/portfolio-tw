"use client";

import { ReactNode } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ShowHeaderLinksProvider from "@/context/ShowHeaderLinksProvider";

interface Props {
   children: ReactNode;
}

const Layout = ({ children }: Props) => {
   return (
      <ShowHeaderLinksProvider>
         <main className="min-h-screen select-none bg-gradient-to-bl from-white-primary via-accent/10 to-white-secondary dark:from-black-secondary dark:via-accent/10 dark:to-black-primary">
            <Header />
            <div className="mx-auto h-full max-w-5xl">{children}</div>
            <Footer />
         </main>
      </ShowHeaderLinksProvider>
   );
};

export default Layout;
