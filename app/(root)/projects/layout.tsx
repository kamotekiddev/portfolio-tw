"use client";
import { useTheme } from "next-themes";
import React, { ReactNode, MouseEvent } from "react";
import { useMotionValue, motion, useMotionTemplate } from "framer-motion";

import Button from "@/components/Button";
import Footer from "@/components/Footer";
import Link from "next/link";
import DarkModeToggle from "@/components/DarkModeToggle";
import socialLinks from "@/data/social-links";
import IconButton from "@/components/IconButton";

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
         className="group/container relative bg-hero-bg-white dark:bg-hero-bg-dark"
      >
         <header className="sticky top-0 z-[1000] backdrop-blur-lg">
            <div className="mx-auto flex max-w-5xl justify-between p-4">
               <Link href="/">
                  <Button variant="outline" size="medium">
                     Go back
                  </Button>
               </Link>
               <div className="space-x-2">
                  {socialLinks.map(({ icon, link }, i) => (
                     <a href={link} target="_black" key={i}>
                        <IconButton icon={icon} />
                     </a>
                  ))}
                  <DarkModeToggle />
               </div>
            </div>
         </header>
         {children}
         <Footer />
         <motion.div
            className="pointer-events-none absolute inset-0 z-[1000] rounded-xl opacity-0 transition duration-300 group-hover/container:opacity-100"
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
