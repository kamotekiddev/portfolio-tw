"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

import profile from "@/assets/profile.jpeg";
import Button from "@/components/Button";

import { fadeInAnimationVarints } from "@/libs/animation";

const HeroSection = () => {
   return (
      <article className="mx-auto grid h-full max-w-7xl place-items-center p-4">
         <div className="mx-auto max-w-4xl text-center">
            <motion.div
               variants={fadeInAnimationVarints}
               custom={0.5}
               initial="initial"
               whileInView="animate"
               transition={{ delay: 0.5 }}
               viewport={{ once: true }}
               className="mx-auto mb-6 h-[150px] w-[150px] overflow-hidden rounded-full"
            >
               <Image src={profile} alt="hero image" />
            </motion.div>
            <motion.h1
               variants={fadeInAnimationVarints}
               initial="initial"
               whileInView="animate"
               viewport={{ once: true }}
               className="mb-6 inline-block text-heading-3 font-black leading-none text-accent-pink lg:text-cta-heading"
            >
               Joshua Dela Cruz
            </motion.h1>
            <motion.p
               variants={fadeInAnimationVarints}
               initial="initial"
               whileInView="animate"
               viewport={{ once: true }}
               transition={{ delay: 0.7 }}
               className="text-paragraph-1 font-light leading-relaxed tracking-wide"
            >
               Experienced{" "}
               <span className="inline-block font-bold text-accent-pink">
                  Frontend Developer
               </span>{" "}
               skilled in crafting user-friendly web apps, translating designs
               to efficient code, and optimizing performance. Committed to
               staying updated on frontend trends and contributing to innovative
               teams.
            </motion.p>
            <motion.div
               variants={fadeInAnimationVarints}
               initial="initial"
               whileInView="animate"
               viewport={{ once: true }}
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
