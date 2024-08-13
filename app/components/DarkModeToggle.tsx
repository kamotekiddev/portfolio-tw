"use client";

import { useTheme } from "next-themes";
import { FaMoon, FaSun } from "react-icons/fa";
import IconButton from "./IconButton";
import { AnimatePresence, motion } from "framer-motion";

const DarkModeToggle = () => {
   const { theme, setTheme } = useTheme();

   return (
      <AnimatePresence mode="wait" initial={false}>
         <motion.div
            style={{ display: "inline-block" }}
            key={theme}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
         >
            <IconButton
               onClick={() => setTheme(theme === "light" ? "dark" : "light")}
               icon={theme === "light" ? FaMoon : FaSun}
            />
         </motion.div>
      </AnimatePresence>
   );
};
export default DarkModeToggle;
