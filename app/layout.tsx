import "./globals.css";
import type { Metadata } from "next";
import ThemeProvider from "./context/ThemeProvider";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
   title: "Joshua Dela Cruz (Kamote Kid)",
   description:
      "A Filipino Frontend Developer based in San Juan, Metro Manila Philippines",
   keywords: [
      "kamote.dev",
      "Joshua Dela Cruz",
      "Software Engineer",
      "Frontend Developer",
      "kamote",
      "kamote.dev",
      "kamote kid",
      "Joshua Ordanza Dela Cruz",
      "Kamote Dev",
      "Frontend Developer Joshua Dela Cruz",
      "Software Engineer Joshua Ordanza",
      "Frontend Development Expert",
      "Kamote Dev Frontend Specialist",
      "JavaScript Developer Joshua Dela Cruz",
      "Kamote Dev Portfolio",
      "Frontend Engineer Kamote Dev",
      "UI/UX Developer Joshua Ordanza",
      "Kamote Dev Software Engineer",
      "React Developer Joshua Dela Cruz",
      "Joshua Ordanza Dela Cruz Web Developer",
      "Frontend Development Services Kamote Dev",
      "Kamote Dev Coding Projects",
   ],
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
