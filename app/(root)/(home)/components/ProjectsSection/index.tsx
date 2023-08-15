"use client";

import { motion } from "framer-motion";
import projects from "@/data/projects";
import SectionHeader from "../SectionHeader";
import ProjectGrid from "./ProjectGrid";
import Button from "@/components/Button";
import Link from "next/link";

const ProjectsSection = () => {
   return (
      <motion.section
         initial={{ opacity: 0 }}
         whileInView={{ opacity: 1 }}
         transition={{ delay: 0.3 }}
         className="py-20"
      >
         <div className="relative mx-auto max-w-7xl px-4">
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
               <SectionHeader className="mb-0">Recent Projects</SectionHeader>
               <Link href="/projects">
                  <Button variant="outline">View All</Button>
               </Link>
            </div>
            <ProjectGrid projects={projects} />
         </div>
      </motion.section>
   );
};

export default ProjectsSection;
