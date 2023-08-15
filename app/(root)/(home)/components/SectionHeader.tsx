"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

import { cn } from "@/libs/utils";

interface Props {
   children: ReactNode;
   className?: string;
}
const SectionHeader = ({ children, className }: Props) => {
   return (
      <motion.h1
         initial={{ opacity: 0 }}
         whileInView={{ opacity: 1 }}
         transition={{ type: "spring", delay: 0.5 }}
         className={cn(
            `mb-10 inline-block rounded-lg text-5xl font-black leading-none text-accent-orange`,
            className
         )}
      >
         {children}
      </motion.h1>
   );
};

export default SectionHeader;
