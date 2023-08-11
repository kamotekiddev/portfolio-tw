"use client";

import { motion } from "framer-motion";
import { differenceInYears } from "date-fns";

import avataars from "@/assets/avataaars.png";
import Image from "next/image";
import Button from "@/components/Button";

const HeroSection = () => {
   const birthday = new Date("2000-07-02");
   const age = differenceInYears(new Date(), birthday);

   return (
      <div className="mx-auto grid h-full max-w-7xl place-items-center p-4">
         <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 h-[150px] w-[150px] overflow-hidden rounded-full bg-white">
               <Image src={avataars} alt="hero image" />
            </div>
            <h1 className="mb-6 inline-block bg-custom-gradient bg-clip-text text-heading-3 font-black leading-none text-transparent lg:text-cta-heading">
               Joshua Dela Cruz
            </h1>
            <p className="text-paragraph-1 font-light leading-relaxed tracking-wide">
               A {age}-year-old, passionate
               <span className="mx-1 bg-custom-gradient bg-clip-text font-semibold text-transparent">
                  Frontend Developer
               </span>
               based in San Juan City, Metro Manila, Philippines. with over 3
               years of actual and over 1 year of work experience
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
               <Button variant="outline">Get In Touch</Button>
               <Button variant="solid">View all Works</Button>
            </div>
         </div>
      </div>
   );
};

export default HeroSection;
