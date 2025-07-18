"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import ExternalLink from "@/components/ExternalLink";
import { FaGithub, FaGlobe } from "react-icons/fa";
import { fadeInAnimationVarints } from "@/libs/animation";

interface Props {
   project: Project;
}

const Tag = ({ tag }: { tag: string }) => {
   return (
      <span className="border-accent text-paragraph-2 text-accent hover:bg-accent shrink-0 rounded-lg border p-1 px-2 transition hover:text-white">
         {tag}
      </span>
   );
};

const Tags = ({ tags }: { tags: string[] }) => {
   return (
      <section className="flex flex-wrap gap-2">
         {tags.map((tag, i) => (
            <Tag key={i} tag={tag} />
         ))}
      </section>
   );
};

const ProjectGridItem = ({ project }: Props) => {
   return (
      <motion.article
         variants={fadeInAnimationVarints}
         initial="initial"
         whileInView="animate"
         viewport={{ once: true }}
         transition={{ delay: 0.5, duration: 0.3 }}
         className="group/project-item relative h-max rounded-lg shadow-lg"
      >
         <div className="h-[250px] w-full overflow-hidden">
            <div className="relative h-full w-full scale-110 transition group-hover/project-item:scale-100">
               <Image
                  className="object-cover"
                  src={project.projectImageBanner}
                  fill
                  alt="Project Banner"
               />
            </div>
         </div>
         <div className="space-y-4 p-4">
            <h1 className="text-heading-6 font-bold">
               <span>{project.projectTitle}</span>
            </h1>
            <div className="flex items-center gap-4">
               <ExternalLink
                  href={project["live-link"] || ""}
                  target="_blank"
                  disabled={!project["live-link"]}
               >
                  <div className="flex items-center gap-2">
                     <FaGlobe /> Live
                  </div>
               </ExternalLink>
               <ExternalLink
                  href={project["github-link"]}
                  target="_blank"
                  disabled={!project["github-link"]}
               >
                  <div className="flex items-center gap-2">
                     <FaGithub /> Github
                  </div>
               </ExternalLink>
            </div>
            <p className="text-paragraph-1 text-justify">
               {project.projectDescription}
            </p>
            <Tags tags={project.toolsUsed} />
         </div>
      </motion.article>
   );
};

export default ProjectGridItem;
