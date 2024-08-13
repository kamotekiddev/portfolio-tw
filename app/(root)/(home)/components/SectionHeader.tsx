"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

import { cn } from "@/libs/utils";
import { fadeInAnimationVarints } from "@/libs/animation";

interface Props {
   children: ReactNode;
   className?: string;
}
const SectionHeader = ({ children, className }: Props) => {
   return (
      <motion.h1
         variants={fadeInAnimationVarints}
         initial="initial"
         whileInView="animate"
         transition={{ delay: 0.5, duration: 0.3 }}
         viewport={{ once: true }}
         className={cn(
            "mb-10 inline-block rounded-lg text-5xl font-bold leading-none text-accent",
            className
         )}
      >
         {children}
      </motion.h1>
   );
};

export default SectionHeader;
