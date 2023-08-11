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
         activeClass="font-bold border-accent-orange text-white-primary dark:text-accent-orange dark:border-accent-orange"
         className="w-full cursor-pointer rounded-lg border border-transparent p-2 px-4 transition-all duration-300 ease-linear hover:text-accent-orange"
         spy
         smooth
         offset={-100}
      >
         {children}
      </Link>
   );
};

export default ScrollLink;
