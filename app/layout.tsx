import "./globals.css";
import type { Metadata } from "next";
import ThemeProvider from "./context/ThemeProvider";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
   title: "Joshua Dela Cruz (Kamote Kid)",
   description:
      "Explore my diverse portfolio showcasing a collection of my creative works, projects, and achievements. From web development to graphic design, you'll find a showcase of my skills and passion for crafting digital experiences. Discover how I bring ideas to life and create meaningful solutions.",
};

interface Props {
   children: React.ReactNode;
}

export default function RootLayout({ children }: Props) {
   return (
      <html lang="en">
         <body className={inter.className}>
            <ThemeProvider defaultTheme="dark" attribute="class">
               {children}
            </ThemeProvider>
         </body>
      </html>
   );
}
