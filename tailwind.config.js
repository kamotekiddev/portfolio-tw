/** @type {import('tailwindcss').Config} */

module.exports = {
   content: [
      "./pages/**/*.{js,ts,jsx,tsx,mdx}",
      "./components/**/*.{js,ts,jsx,tsx,mdx}",
      "./app/**/*.{js,ts,jsx,tsx,mdx}",
   ],
   darkMode: "class",
   theme: {
      extend: {
         colors: {
            "black-primary": "#161513",
            "black-secondary": "#1C1C22",
            "white-primary": "#F0F2F5",
            "white-secondary": "#FFFFFF",
            accent: "#10b981",
         },
         backgroundImage: {
            "hero-bg-dark":
               "radial-gradient(circle, rgba(22,21,19,1) 0%, rgba(28,28,34,1) 35%, rgba(32,32,48,1) 60%, rgba(0,0,0,1) 100%)",
            "hero-bg-white":
               "radial-gradient(circle, rgba(235,235,255,1) 25%, rgba(240,242,245,1) 50%, rgba(212,212,212,1) 75%, rgba(255,255,255,1) 100%)",
         },
         fontSize: {
            "cta-heading": "84px",
            "heading-1": "72px",
            "heading-2": "64px",
            "heading-3": "56px",
            "heading-4": "48px",
            "heading-5": "32px",
            "heading-6": "24px",
            "paragraph-1": "18px",
            "paragraph-2": "16px",
            "big-paragraph": "32px",
            "mobile-paragraph": "24px",
         },
      },
   },
   plugins: [],
};
