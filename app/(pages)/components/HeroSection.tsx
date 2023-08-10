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
      <motion.div className="grid h-full place-items-center bg-white-primary dark:bg-black-primary">
         <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto h-[150px] w-[150px] overflow-hidden rounded-full bg-white">
               <Image src={avataars} alt="hero image" />
            </div>
            <h1 className="inline-block bg-custom-gradient bg-clip-text text-cta-heading font-bold text-transparent">
               Joshua Dela Cruz
            </h1>
            <p className="text-paragraph-1 font-light leading-relaxed tracking-wide">
               A {age}-year-old, passionate
               <span className="mx-1 bg-custom-gradient bg-clip-text font-semibold text-transparent">
                  Frontend Developer
               </span>
               based in San Juan City, Metro Manila, Philippines. An experienced
               Frontend Developer with a proven track record of crafting
               visually appealing and user-centric web applications.
            </p>
            <div className="mt-10 space-x-6">
               <Button variant="outline">Get In Touch</Button>
               <Button variant="solid">View all Works</Button>
            </div>
         </div>
      </motion.div>
   );
};

export default HeroSection;
