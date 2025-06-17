"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import heroImage from "@/assets/heroimage.webp";

import { fadeInAnimationVarints } from "@/libs/animation";
import socialLinks from "@/data/social-links";
import SocialLinks from "./SocialLinks";

const HeroSection = () => {
   return (
      <article className="mx-auto grid h-full max-w-7xl place-items-center p-4">
         <div className="mx-auto max-w-4xl space-y-6 text-center">
            <motion.div
               variants={fadeInAnimationVarints}
               initial="initial"
               whileInView="animate"
               transition={{ delay: 0.2, duration: 0.2 }}
               viewport={{ once: true }}
               className="mx-auto h-[150px] w-[150px] overflow-hidden rounded-full bg-linear-to-bl from-white-primary via-accent/10 to-white-secondary dark:from-black-secondary dark:via-accent/10 dark:to-black-primary"
            >
               <Image
                  src={heroImage}
                  alt="hero image"
                  width={150}
                  height={150}
                  layout="responsive"
                  objectFit="cover"
                  objectPosition="center"
                  className="rounded-full"
                  priority
               />
            </motion.div>
            <motion.h1
               variants={fadeInAnimationVarints}
               initial="initial"
               whileInView="animate"
               viewport={{ once: true }}
               transition={{ duration: 0.2 }}
               className="inline-block text-4xl font-extrabold leading-none text-accent lg:text-heading-1"
            >
               Joshua Dela Cruz
            </motion.h1>
            <motion.p
               variants={fadeInAnimationVarints}
               initial="initial"
               animate="animate"
               transition={{ delay: 0.3, duration: 0.3 }}
               className="text-paragraph-1"
            >
               A Filipino Software Developer based in San Juan, Metro Manila
               Philippines
            </motion.p>
            <motion.div
               initial={{ width: 0 }}
               animate={{ width: "100%" }}
               transition={{ delay: 0.3, duration: 0.5 }}
               className="h-px w-full bg-black-primary/10 dark:bg-white-primary/10"
            />
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
               <SocialLinks />
               <motion.div
                  variants={fadeInAnimationVarints}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="hidden h-10 w-px bg-black-primary/10 dark:bg-white-primary/10 sm:block"
               />
               <motion.p
                  variants={fadeInAnimationVarints}
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true }}
                  transition={{
                     delay: 0.1 * socialLinks.length,
                     duration: 0.1,
                  }}
                  className="text-xl font-semibold"
               >
                  Frontend Software Developer
               </motion.p>
            </div>
         </div>
      </article>
   );
};

export default HeroSection;
