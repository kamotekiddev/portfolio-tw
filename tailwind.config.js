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
