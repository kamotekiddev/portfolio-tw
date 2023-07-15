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
         activeClass="font-bold text-white bg-indigo-600"
         className="w-full cursor-pointer rounded-lg p-2 px-4 transition-all duration-200 ease-linear hover:bg-indigo-50 hover:text-indigo-600"
         spy
         smooth
         offset={-100}
      >
         {children}
      </Link>
   );
};

export default ScrollLink;
