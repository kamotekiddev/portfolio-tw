import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
   const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
         ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
         : "http://localhost:3000");

   return {
      rules: { userAgent: "*", allow: "/" },
      sitemap: new URL("/sitemap.xml", origin).toString(),
   };
}
