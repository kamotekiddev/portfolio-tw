"use client";

import Button from "@/components/Button";
import { motion } from "framer-motion";
import Image from "next/image";

interface Props {
   project: Project;
}

const Tag = ({ tag }: { tag: string }) => {
   return (
      <span className="flex-shrink-0 rounded-lg bg-white-primary p-1 px-2 text-paragraph-2 text-accent-orange dark:bg-white-secondary">
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
         initial={{ opacity: 0 }}
         whileInView={{ opacity: 1 }}
         className="group/project-grid relative h-max cursor-pointer overflow-hidden rounded-lg shadow-lg"
      >
         <div className="relative h-[250px] w-full">
            <Image
               src={project.projectImageBanner}
               objectFit="cover"
               fill
               alt="Project Banner"
            />
         </div>
         <div className="space-y-4 p-4">
            <h1 className="text-heading-6 font-black">
               {project.projectTitle}
            </h1>
            <p className="text-justify text-paragraph-1">
               {project.projectDescription}
            </p>
            <Tags tags={project.toolsUsed} />
         </div>
         <div className="absolute inset-0 grid place-items-center opacity-0 backdrop-blur-xl transition-all duration-300 ease-in-out group-hover/project-grid:hover:opacity-100">
            <div className="space-x-4">
               <a href={project["live-link"]} target="_blank">
                  <Button
                     size="medium"
                     variant="outline"
                     disabled={!project["live-link"]}
                  >
                     View Live
                  </Button>
               </a>
               <a href={project["github-link"]} target="_blank">
                  <Button
                     size="medium"
                     variant="outline"
                     disabled={!project["github-link"]}
                  >
                     View Source
                  </Button>
               </a>
            </div>
         </div>
      </motion.article>
   );
};

export default ProjectGridItem;
