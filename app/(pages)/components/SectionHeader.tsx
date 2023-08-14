"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
   children: ReactNode;
}
const SectionHeader = ({ children: chidlren }: Props) => {
   return (
      <motion.h1
         initial={{ opacity: 0 }}
         whileInView={{ opacity: 1 }}
         transition={{ type: "spring", delay: 0.5 }}
         className="mb-10 inline-block rounded-lg text-heading-1 font-black leading-none text-accent-orange"
      >
         {chidlren}
      </motion.h1>
   );
};

export default SectionHeader;
