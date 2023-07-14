import { ReactNode } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

interface Props {
   children: ReactNode;
}

const Layout = ({ children }: Props) => {
   return (
      <main className="relative min-h-screen max-w-4xl mx-auto">
         <Header />
         <div className="h-full">{children}</div>
         <Footer />
      </main>
   );
};

export default Layout;
