import "./globals.css";
import type { Metadata } from "next";
import ThemeProvider from "./context/ThemeProvider";
import { Geist } from "next/font/google";

const geist = Geist({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
   metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ||
         (process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
            : "http://localhost:3000")
   ),
   title: "Joshua Dela Cruz — Software x AI Engineer",
   description:
      "Software engineer in Metro Manila focused on AI engineering, product applications, React, and Next.js. Explore projects, experience, and freelance work.",
   openGraph: {
      title: "Joshua Dela Cruz — Software x AI Engineer",
      description:
         "Software engineering, product applications, and an AI engineering focus. Selected work and experience from Metro Manila.",
      type: "website",
      images: [
         {
            url: "/social-preview",
            width: 1200,
            height: 630,
            alt: "Joshua Dela Cruz. Software x AI Engineer. Product software in React, Next.js, and AI.",
         },
      ],
   },
   twitter: {
      card: "summary_large_image",
      title: "Joshua Dela Cruz — Software x AI Engineer",
      description:
         "Product engineering experience and a focus on useful AI applications.",
      images: ["/social-preview"],
   },
};

export default function RootLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return (
      <html lang="en" className="dark" suppressHydrationWarning>
         <body className={geist.className}>
            <ThemeProvider
               defaultTheme="dark"
               attribute="class"
               enableSystem={false}
               disableTransitionOnChange
            >
               {children}
            </ThemeProvider>
         </body>
      </html>
   );
}
