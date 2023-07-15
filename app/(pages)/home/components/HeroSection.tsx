"use client";

import { differenceInYears } from "date-fns";
import ButtonLink from "@/components/ButtonLink";
import Lottie from "lottie-react";
import lottieProgramming from "@/assets/lottie-programming.json";

const HeroSection = () => {
   const birthday = new Date("2000-07-02");
   const age = differenceInYears(new Date(), birthday);

   return (
      <div className="relative h-full">
         <Lottie
            className="absolute left-10 top-1/2 mb-4 h-72 w-72 -translate-y-1/2 lg:h-96 lg:w-96"
            animationData={lottieProgramming}
         />
         <div className="grid h-full place-items-center text-center backdrop-blur">
            <div className="grid h-full place-items-center text-center backdrop-blur">
               <div>
                  <h1 className="text-4xl font-black text-indigo-600 [text-shadow:_0_0_10px_rgb(255_255_255)] dark:[text-shadow:_0_0_10px_black]">
                     Joshua Dela Cruz
                  </h1>
                  <hr className="my-6 bg-indigo-600" />
                  <p className="max-w-xl font-medium [text-shadow:_0_0_20px_white] dark:[text-shadow:_0_0_20px_black]">
                     A {age} years old passionate{" "}
                     <span className="font-bold text-indigo-600">
                        Front-End Developer
                     </span>{" "}
                     based in San Juan City Metro Manila Philippines
                  </p>
                  <hr className="my-6 bg-indigo-600" />
                  <div className="flex flex-wrap justify-center gap-4">
                     <ButtonLink to="about">Me</ButtonLink>
                     <ButtonLink to="projects">My Projects</ButtonLink>
                     <ButtonLink to="contact">Connect with Me</ButtonLink>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default HeroSection;
