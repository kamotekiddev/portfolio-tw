"use client";

import { motion } from "framer-motion";
import { differenceInYears } from "date-fns";

import heroImage from "@/assets/heroimage.png";
import ButtonLink from "@/components/ButtonLink";
import Image from "next/image";

const HeroSection = () => {
   const birthday = new Date("2000-07-02");
   const age = differenceInYears(new Date(), birthday);

   return (
      <motion.div
         initial={{ scale: 0 }}
         whileInView={{ scale: 1 }}
         transition={{ delay: 0.3, type: "spring", duration: 1 }}
         className="grid h-full place-items-center"
      >
         <div className="space-y-6 text-center">
            <div className="mx-auto h-[200px] w-[200px] overflow-hidden rounded-full bg-white">
               <Image
                  src={heroImage}
                  alt="hero image"
                  className="origin-top scale-[1.2]"
               />
            </div>
            <h1 className="text-4xl font-black text-indigo-600 sm:text-5xl md:text-6xl lg:text-7xl">
               Joshua Dela Cruz
            </h1>
            <div className="my-6 h-px bg-neutral-500" />
            <p className="mx-auto max-w-xl font-medium">
               A {age} years old passionate{" "}
               <span className="font-bold text-indigo-600">
                  Front-End Developer
               </span>{" "}
               based in San Juan City Metro Manila Philippines
            </p>
            <div className="my-6 h-px bg-neutral-500" />
            <div className="flex flex-wrap justify-center gap-4">
               <ButtonLink to="about">Me</ButtonLink>
               <ButtonLink to="projects">My Projects</ButtonLink>
               <ButtonLink to="contact">Connect with Me</ButtonLink>
            </div>
         </div>
      </motion.div>
   );
};

export default HeroSection;
