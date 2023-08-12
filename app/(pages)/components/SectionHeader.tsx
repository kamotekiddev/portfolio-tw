"use client";
import { ReactNode } from "react";

interface Props {
   children: ReactNode;
}
const SectionHeader = ({ children: chidlren }: Props) => {
   return (
      <h1 className="mb-10 inline-block rounded-lg text-heading-1 font-black leading-none text-accent-orange">
         {chidlren}
      </h1>
   );
};

export default SectionHeader;
