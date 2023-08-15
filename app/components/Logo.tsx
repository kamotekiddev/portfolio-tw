"use client";

import { Link } from "react-scroll";

const Logo = () => {
   return (
      <Link to="home" smooth className="cursor-pointer" offset={-100}>
         <h1 className="inline-block bg-custom-gradient bg-clip-text text-heading-6 font-black text-transparent">
            KAMOTE KID
         </h1>
      </Link>
   );
};

export default Logo;
