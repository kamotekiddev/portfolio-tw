"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { FiMoon, FiSun } from "react-icons/fi";

export default function DarkModeToggle() {
   const { resolvedTheme, setTheme } = useTheme();
   const [mounted, setMounted] = useState(false);
   useEffect(() => setMounted(true), []);
   const isLight = mounted && resolvedTheme === "light";

   return (
      <button
         type="button"
         className="theme-toggle"
         disabled={!mounted}
         aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
         onClick={() => setTheme(isLight ? "dark" : "light")}
      >
         {isLight ? (
            <FiMoon aria-hidden="true" />
         ) : (
            <FiSun aria-hidden="true" />
         )}
      </button>
   );
}
