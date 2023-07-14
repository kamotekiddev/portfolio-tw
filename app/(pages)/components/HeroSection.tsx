import Logo from "@/components/Logo";
import { differenceInYears } from "date-fns";
import React from "react";

const HeroSection = () => {
   const birthday = new Date("2000-07-02");
   const age = differenceInYears(new Date(), birthday);

   return (
      <div className="h-full grid place-items-center">
         <div className="text-center">
            <h1 className="font-black text-4xl text-indigo-600">
               Joshua Dela Cruz
            </h1>
            <hr className="my-4 bg-indigo-600" />
            <p className="max-w-xl text-lg">
               A {age} years old passionate{" "}
               <span className="text-indigo-600 font-bold">
                  FRONT-END DEVELOPER
               </span>{" "}
               based in San Juan City Metro Manila Philippines
            </p>
            <hr className="my-4 bg-indigo-600" />
            <div className="space-x-4">
               <button className="p-2 px-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white transition-colors duration-100 ease-in-out rounded-lg">
                  Me
               </button>
               <button className="p-2 px-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white transition-colors duration-100 ease-in-out rounded-lg">
                  My Projects
               </button>
               <button className="p-2 px-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white transition-colors duration-100 ease-in-out rounded-lg">
                  Connect with Me
               </button>
            </div>
         </div>
      </div>
   );
};

export default HeroSection;
