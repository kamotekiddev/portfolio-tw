"use client";

import { motion } from "framer-motion";
import techstacks from "@/data/techstacks";
import experiences from "@/data/experiences";
import ExperienceTimeline from "./ExperienceTimeline";
import SectionHeader from "../SectionHeader";

const AboutSection = () => {
   return (
      <section className="mx-auto max-w-7xl space-y-20 px-4 py-20">
         <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
         >
            <SectionHeader>About Me</SectionHeader>
            <p className="text-justify text-paragraph-1 leading-loose">
               Hello, I&apos;m Joshua Dela Cruz, a passionate software engineer
               specializing in front-end development. With a strong dedication
               to detail and a focus on continuous growth, I am excited to
               contribute my expertise to impactful projects. I am actively
               seeking new opportunities to expand my skill set and advance my
               career as a software engineer. Let&apos;s collaborate and create
               remarkable solutions together!
            </p>
         </motion.div>
         <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", duration: 1 }}
         >
            <h2 className="mb-8 inline-block text-heading-4 font-black leading-none">
               Technology Stack
            </h2>
            <div className="flex flex-wrap gap-4">
               {techstacks.map((techStack, i) => (
                  <motion.div
                     key={techStack}
                     initial={{ scale: 0, opacity: 0 }}
                     whileInView={{ scale: 1, opacity: 1 }}
                     transition={{
                        delay: (i + 1) / 10,
                        type: "spring",
                     }}
                     className="rounded-full bg-white-secondary p-2 px-4 text-paragraph-1 dark:bg-accent-orange"
                  >
                     {techStack}
                  </motion.div>
               ))}
            </div>
         </motion.div>
         <div>
            <h2 className="mb-10 text-heading-4 font-black leading-none">
               Experiences
            </h2>
            <ExperienceTimeline experiences={experiences} />
         </div>
      </section>
   );
};

export default AboutSection;