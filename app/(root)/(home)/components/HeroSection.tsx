"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import profile from "@/assets/profile.jpeg";

import { fadeInAnimationVarints } from "@/libs/animation";
import socialLinks from "@/data/social-links";
import IconButton from "@/components/IconButton";

const HeroSection = () => {
   return (
      <article className="mx-auto grid h-full max-w-7xl place-items-center p-4">
         <div className="mx-auto max-w-4xl space-y-6 text-center">
            <motion.div
               variants={fadeInAnimationVarints}
               initial="initial"
               whileInView="animate"
               transition={{ delay: 0.5 }}
               viewport={{ once: true }}
               className="mx-auto h-[150px] w-[150px] overflow-hidden rounded-full"
            >
               <Image src={profile} alt="hero image" />
            </motion.div>
            <motion.h1
               variants={fadeInAnimationVarints}
               initial="initial"
               whileInView="animate"
               viewport={{ once: true }}
               className="inline-block text-heading-3 font-black leading-none text-accent-pink lg:text-heading-1"
            >
               Joshua Dela Cruz
            </motion.h1>
            <motion.p
               variants={fadeInAnimationVarints}
               initial="initial"
               animate="animate"
               transition={{ delay: 0.5 }}
               className="text-paragraph-1"
            >
               A Filipino Software Developer based in San Juan, Metro Manila
               Philippines
            </motion.p>
            <motion.div
               initial={{ width: 0 }}
               animate={{ width: "100%" }}
               transition={{ delay: 0.5, duration: 0.5 }}
               className="h-px w-full bg-black-primary/10 dark:bg-white-primary/10"
            />
            <div className="flex items-center justify-center gap-4">
               <div className="space-x-2">
                  {socialLinks.map(({ icon, link }, i) => (
                     <motion.a
                        variants={fadeInAnimationVarints}
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 * i }}
                        href={link}
                        target="_black"
                        key={i}
                     >
                        <IconButton icon={icon} />
                     </motion.a>
                  ))}
               </div>
               <motion.div
                  variants={fadeInAnimationVarints}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: 0.5 }}
                  className="h-10 w-px bg-black-primary/10 dark:bg-white-primary/10"
               />
               <motion.p
                  variants={fadeInAnimationVarints}
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 * socialLinks.length }}
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
