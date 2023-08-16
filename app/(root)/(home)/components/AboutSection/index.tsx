"use client";

import { motion } from "framer-motion";
import SectionHeader from "../SectionHeader";
import Experiences from "./Experiences";
import TechStacks from "./TechStacks";

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
         <TechStacks />
         <Experiences />
      </section>
   );
};

export default AboutSection;
