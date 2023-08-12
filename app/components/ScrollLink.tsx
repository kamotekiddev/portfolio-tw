"use client";

import { ReactNode } from "react";
import { Link } from "react-scroll";

interface Props {
   to: string;
   children: ReactNode;
}

const ScrollLink = ({ to, children }: Props) => {
   return (
      <Link
         to={to}
         activeClass="font-bold text-accent-orange border-orange-400"
         className="w-full cursor-pointer select-none rounded-lg border border-transparent p-2 px-4 transition-all duration-300 ease-linear hover:text-accent-orange"
         spy
         offset={-10}
         smooth
      >
         {children}
      </Link>
   );
};

export default ScrollLink;
