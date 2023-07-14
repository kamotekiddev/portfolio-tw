"use client";

import { differenceInYears } from "date-fns";
import ButtonLink from "@/components/ButtonLink";
import Lottie from "lottie-react";
import lottieProgramming from "@/assets/lottie-programming.json";

const HeroSection = () => {
   const birthday = new Date("2000-07-02");
   const age = differenceInYears(new Date(), birthday);

   return (
      <div className="h-full relative">
         <Lottie
            className="w-96 h-96 mb-4 absolute left-10 top-1/2 -translate-y-1/2"
            animationData={lottieProgramming}
         />
         <div className="text-center h-full backdrop-blur-xl dark:backdrop-blur-md grid place-items-center">
            <div>
               <h1 className="font-black text-4xl text-indigo-600">
                  Joshua Dela Cruz
               </h1>
               <hr className="my-6 bg-indigo-600" />
               <p className="max-w-xl text-lg">
                  A {age} years old passionate{" "}
                  <span className="text-indigo-600 font-bold">
                     FRONT-END DEVELOPER
                  </span>{" "}
                  based in San Juan City Metro Manila Philippines
               </p>
               <hr className="my-6 bg-indigo-600" />
               <div className="space-x-4">
                  <ButtonLink to="about">Me</ButtonLink>
                  <ButtonLink to="projects">My Projects</ButtonLink>
                  <ButtonLink to="contact">Connect with Me</ButtonLink>
               </div>
            </div>
         </div>
      </div>
   );
};

export default HeroSection;
