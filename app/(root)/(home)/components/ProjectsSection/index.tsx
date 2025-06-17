"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import projects from "@/data/projects";
import SectionHeader from "../SectionHeader";
import { fadeInAnimationVarints } from "@/libs/animation";

const ProjectGrid = dynamic(() => import("./ProjectGrid"), { ssr: false });

const ProjectsSection = () => {
   return (
      <motion.section
         variants={fadeInAnimationVarints}
         initial="initial"
         whileInView="animate"
         transition={{ delay: 0.3 }}
         className="py-20"
      >
         <div className="relative mx-auto max-w-7xl px-4">
            <SectionHeader className="mb-10">Practice Projects</SectionHeader>
            <ProjectGrid projects={projects} />
         </div>
      </motion.section>
   );
};

export default ProjectsSection;
