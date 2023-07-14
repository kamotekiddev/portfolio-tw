"use client";

import { useTheme } from "next-themes";
import { FaMoon, FaSun } from "react-icons/fa";
import IconButton from "./IconButton";

const DarkModeToggle = () => {
   const { theme, setTheme } = useTheme();

   return (
      <IconButton
         onClick={() => setTheme(theme === "light" ? "dark" : "light")}
         icon={theme === "light" ? FaMoon : FaSun}
      />
   );
};
export default DarkModeToggle;
