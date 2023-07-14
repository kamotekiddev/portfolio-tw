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
         className="cursor-pointer p-2 px-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white transition-colors duration-100 ease-in-out rounded-lg"
      >
         {children}
      </Link>
   );
};

export default ButtonLink;
