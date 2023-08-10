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
         },
         backgroundImage: {
            "custom-gradient":
               "linear-gradient(90deg, rgba(177,108,234,1) 25%, rgba(255,94,105,1) 50%, rgba(255,138,86,1) 75%, rgba(255,168,75,1) 100%, rgba(9,9,121,1) 100%)",
         },
      },
   },
   plugins: [],
};
