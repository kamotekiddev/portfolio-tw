import "./globals.css";
import type { Metadata } from "next";
import ThemeProvider from "./context/ThemeProvider";
import { Geist } from "next/font/google";
import SeasonAmbient from "./components/SeasonAmbient";
import { seasonInitScript } from "./data/seasons";
import { themeInitScript } from "./data/theme-schedule";

const geist = Geist({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
   metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ||
         (process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
            : "http://localhost:3000")
   ),
   title: "Joshua Dela Cruz — Software Engineer",
   description:
      "Joshua Dela Cruz, software engineer in Metro Manila. Full-stack development with Next.js, .NET, Node.js, and PostgreSQL, plus AI exploration.",
   alternates: { canonical: "/" },
   openGraph: {
      title: "Joshua Dela Cruz — Software Engineer",
      description:
         "Joshua Dela Cruz, software engineer in Metro Manila. Full-stack development with Next.js, .NET, Node.js, and PostgreSQL, plus AI exploration.",
      type: "website",
      images: [
         {
            url: "/social-preview",
            width: 1200,
            height: 630,
            alt: "Joshua Dela Cruz. Software Engineer. System design. Full-stack development. AI exploration.",
         },
      ],
   },
   twitter: {
      card: "summary_large_image",
      title: "Joshua Dela Cruz — Software Engineer",
      description:
         "Joshua Dela Cruz, software engineer in Metro Manila. Full-stack development with Next.js, .NET, Node.js, and PostgreSQL, plus AI exploration.",
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
            {/* Resolves the theme mode and writes next-themes' "theme" key before
                its pre-paint script (rendered by ThemeProvider below) runs. */}
            <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
            {/* Sets data-season on <html> before first paint (FR-010). */}
            <script dangerouslySetInnerHTML={{ __html: seasonInitScript }} />
            <SeasonAmbient />
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
