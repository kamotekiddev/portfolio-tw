"use client";
import { ReactNode } from "react";

interface Props {
   children: ReactNode;
}
const SectionHeader = ({ children: chidlren }: Props) => {
   return (
      <h1 className="mb-8 w-max rounded-lg bg-indigo-50 p-2 px-4 text-3xl font-black text-indigo-600 dark:bg-indigo-600 dark:text-white">
         {chidlren}
      </h1>
   );
};

export default SectionHeader;
