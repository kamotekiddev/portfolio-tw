"use client";
import { motion } from "framer-motion";
import ProjectCard from "@/components/ProjectCard";
import SectionHeader from "./SectionHeader";
import projects from "@/data/projects";

const ProjectsSection = () => {
   return (
      <motion.div
         initial={{ opacity: 0 }}
         whileInView={{ opacity: 1 }}
         transition={{ delay: 0.3 }}
         className="py-20"
      >
         <div className="mx-auto max-w-7xl px-4">
            <SectionHeader>Recent Projects</SectionHeader>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
               {projects.map((project) => (
                  <ProjectCard
                     key={project.id}
                     image={project.projectImageBanner}
                     delay={project.id}
                     title={project.projectTitle}
                     description={project.projectDescription}
                     tags={project.toolsUsed}
                  />
               ))}
            </div>
         </div>
      </motion.div>
   );
};

export default ProjectsSection;
