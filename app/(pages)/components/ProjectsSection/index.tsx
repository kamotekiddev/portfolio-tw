"use client";

import { motion } from "framer-motion";
import projects from "@/data/projects";
import SectionHeader from "../SectionHeader";
import ProjectGrid from "./ProjectGrid";

const ProjectsSection = () => {
   return (
      <motion.section
         initial={{ opacity: 0 }}
         whileInView={{ opacity: 1 }}
         transition={{ delay: 0.3 }}
         className="py-20"
      >
         <div className="mx-auto max-w-7xl px-4">
            <SectionHeader>My Projects</SectionHeader>
            <ProjectGrid projects={projects} />
         </div>
      </motion.section>
   );
};

export default ProjectsSection;
