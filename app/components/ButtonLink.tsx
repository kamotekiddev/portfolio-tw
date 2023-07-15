"use client";

import { ReactNode } from "react";
import { Link } from "react-scroll";

interface Props {
   children: ReactNode;
   to: string;
}
const ButtonLink = ({ children, to }: Props) => {
   return (
      <Link
         to={to}
         smooth
         offset={-100}
         className="cursor-pointer rounded-lg bg-indigo-50 p-2 px-4 text-indigo-600 transition-colors duration-100 ease-in-out hover:bg-indigo-500 hover:text-white"
      >
         {children}
      </Link>
   );
};

export default ButtonLink;
