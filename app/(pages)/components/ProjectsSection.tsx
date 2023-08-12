"use client";

import { motion } from "framer-motion";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
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
            <ResponsiveMasonry
               columnsCountBreakPoints={{ 350: 2, 750: 2, 900: 3 }}
            >
               <Masonry gutter="1.5rem">
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
               </Masonry>
            </ResponsiveMasonry>
         </div>
      </motion.div>
   );
};

export default ProjectsSection;
