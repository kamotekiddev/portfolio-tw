"use client";

import { useTheme } from "next-themes";
import { useMotionValue, motion, useMotionTemplate } from "framer-motion";
import { MouseEvent, ReactNode } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

interface Props {
   children: ReactNode;
}

const Layout = ({ children }: Props) => {
   const { theme } = useTheme();
   let mouseX = useMotionValue(0);
   let mouseY = useMotionValue(0);

   const handleMouseMove = ({
      clientX,
      clientY,
      currentTarget,
   }: MouseEvent) => {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
   };

   return (
      <main
         onMouseMove={handleMouseMove}
         className="group relative min-h-screen select-none bg-hero-bg-white dark:bg-hero-bg-dark"
      >
         <Header />
         <div className="mx-auto h-full max-w-5xl">{children}</div>
         <Footer />
         <motion.div
            className="pointer-events-none absolute inset-0 z-[1000] rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
            style={{
               background:
                  theme === "dark"
                     ? useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(14, 165, 233, 0.15),
              transparent 80%
            )`
                     : useMotionTemplate`
          radial-gradient(
            650px circle at ${mouseX}px ${mouseY}px,
            rgba(4, 1, 4, 0.15),
            transparent 80%
          )
        `,
            }}
         />
      </main>
   );
};

export default Layout;
