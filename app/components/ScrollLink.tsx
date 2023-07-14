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
         className="transition-all w-full p-2 px-4 rounded-lg duration-200 ease-linear cursor-pointer"
         spy
         smooth
         offset={-100}
      >
         {children}
      </Link>
   );
};

export default ScrollLink;
