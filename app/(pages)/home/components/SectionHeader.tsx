"use client";
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
   children: ReactNode;
}
const SectionHeader = ({ children: chidlren }: Props) => {
   return (
      <motion.div
         initial={{ x: -1000 }}
         transition={{ delay: 0.5 }}
         whileInView={{ x: 0 }}
      >
         <h1 className="mb-8 w-max rounded-lg bg-indigo-50 p-2 px-4 text-3xl font-black text-indigo-600 dark:bg-indigo-600 dark:text-white">
            {chidlren}
         </h1>
      </motion.div>
   );
};

export default SectionHeader;
