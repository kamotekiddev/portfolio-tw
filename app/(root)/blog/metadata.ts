import type { Metadata } from "next";

export function blogMetadata({
   title,
   description,
   path,
   publishedAt,
}: {
   title: string;
   description: string;
   path: string;
   publishedAt?: string;
}): Metadata {
   const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
         ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
         : "http://localhost:3000");
   const canonical = new URL(path, origin).toString();
   const image = new URL("/social-preview", origin).toString();

   return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
         title,
         description,
         url: canonical,
         ...(publishedAt
            ? { type: "article" as const, publishedTime: publishedAt }
            : { type: "website" as const }),
         images: [{ url: image, width: 1200, height: 630 }],
      },
      twitter: {
         card: "summary_large_image",
         title,
         description,
         images: [image],
      },
   };
}
