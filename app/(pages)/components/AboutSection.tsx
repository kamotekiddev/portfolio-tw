"use client";
import { motion } from "framer-motion";
import techstacks from "@/data/techstacks";
import ExperienceTimeline from "@/components/ExperienceTimeline";
import SectionHeader from "./SectionHeader";

const AboutSection = () => {
   return (
      <div className="mx-auto max-w-7xl space-y-20">
         <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
         >
            <SectionHeader>About Me</SectionHeader>
            <p className="text-justify leading-loose">
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
            <h2 className="mb-8 inline-block text-heading-4 font-black">
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
                        duration: (i + 1) / 10,
                     }}
                     className="rounded-full bg-white-secondary p-2 px-4 dark:bg-accent-orange"
                  >
                     {techStack}
                  </motion.div>
               ))}
            </div>
         </motion.div>
         <div>
            <h2 className="mb-8 text-heading-4 font-black">Experiences</h2>
            <div>
               <ExperienceTimeline />
            </div>
         </div>
      </div>
   );
};

export default AboutSection;
