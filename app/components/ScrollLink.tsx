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
         activeClass="font-bold text-indigo-500"
         className="transition-all duration-200 ease-linear cursor-pointer"
         spy
         smooth
         offset={-100}
      >
         {children}
      </Link>
   );
};

export default ScrollLink;
