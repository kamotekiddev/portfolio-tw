"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import avataars from "@/assets/avataaars.png";
import Image from "next/image";
import Button from "@/components/Button";

const HeroSection = () => {
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
               Experienced{" "}
               <span className="inline-block bg-custom-gradient bg-clip-text text-transparent">
                  Frontend Developer
               </span>{" "}
               skilled in crafting user-friendly web apps, translating designs
               to efficient code, and optimizing performance. Committed to
               staying updated on frontend trends and contributing to innovative
               teams.
            </motion.p>
            <motion.div
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               transition={{ delay: 1 }}
               className="mt-10 flex flex-wrap justify-center gap-4"
            >
               <Link href="/projects">
                  <Button variant="solid">View all Works</Button>
               </Link>
            </motion.div>
         </div>
      </article>
   );
};

export default HeroSection;
