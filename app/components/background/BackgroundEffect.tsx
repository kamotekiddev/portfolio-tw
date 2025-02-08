"use client";

import { useTheme } from "next-themes";
import Aurora from "./Aurora";

function BackgroundEffect() {
   const { theme } = useTheme();

   if (theme !== "dark") return;
   return <Aurora />;
}

export default BackgroundEffect;
