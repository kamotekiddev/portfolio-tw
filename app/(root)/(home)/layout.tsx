import { ReactNode } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

interface Props {
   children: ReactNode;
}

const Layout = ({ children }: Props) => {
   return (
      <main className=" min-h-screen select-none bg-hero-bg-white dark:bg-hero-bg-dark">
         <Header />
         <div className="h-full">{children}</div>
         <Footer />
      </main>
   );
};

export default Layout;
