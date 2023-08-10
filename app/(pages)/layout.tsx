import { ReactNode } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

interface Props {
   children: ReactNode;
}

const Layout = ({ children }: Props) => {
   return (
      <main className=" min-h-screen">
         <Header />
         <div className="h-full">{children}</div>
         <Footer />
      </main>
   );
};

export default Layout;
