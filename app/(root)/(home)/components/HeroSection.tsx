"use client";

import { differenceInYears } from "date-fns";

import { motion } from "framer-motion";
import avataars from "@/assets/avataaars.png";
import Image from "next/image";
import Button from "@/components/Button";
import Link from "next/link";
import ScrollLink from "@/components/ScrollLink";

const HeroSection = () => {
   const birthday = new Date("2000-07-02");
   const age = differenceInYears(new Date(), birthday);

   return (
      <article className="mx-auto grid h-full max-w-7xl place-items-center p-4">
         <div className="mx-auto max-w-4xl text-center">
            <motion.div
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               transition={{ delay: 0.5 }}
               className="mx-auto mb-6 h-[150px] w-[150px] overflow-hidden rounded-full bg-white"
            >
               <Image src={avataars} alt="hero image" />
            </motion.div>
            <motion.h1
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               className="mb-6 inline-block bg-custom-gradient bg-clip-text text-heading-3 font-black leading-none text-transparent lg:text-cta-heading"
            >
               Joshua Dela Cruz
            </motion.h1>
            <motion.p
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               transition={{ delay: 0.7 }}
               className="text-paragraph-1 font-light leading-relaxed tracking-wide"
            >
               A {age}-year-old, passionate
               <span className="mx-1 bg-custom-gradient bg-clip-text font-semibold text-transparent">
                  Frontend Developer
               </span>
               based in San Juan City, Metro Manila, Philippines. with over 3
               years of actual and over 1 year of work experience
            </motion.p>
            <motion.div
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               transition={{ delay: 1 }}
               className="mt-10 flex flex-wrap justify-center gap-4"
            >
               <ScrollLink to="contact">
                  <Button variant="outline">Get In Touch</Button>
               </ScrollLink>
               <Link href="/projects">
                  <Button variant="solid">View all Works</Button>
               </Link>
            </motion.div>
         </div>
      </article>
   );
};

export default HeroSection;
