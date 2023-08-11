"use client";

import { motion } from "framer-motion";

interface Props {
   delay: number;
   title: string;
   description: string;
   tags: string[];
}

const ProjectCard = ({ delay, title, description, tags }: Props) => {
   return (
      <motion.div
         initial={{ opacity: 0 }}
         whileInView={{ opacity: 1 }}
         transition={{ delay: (delay + 1) / 10, type: "just" }}
         className="cursor-pointer overflow-hidden rounded-lg shadow-md"
      >
         <div className="h-[250px] w-full bg-accent-orange"></div>
         <div className="p-4">
            <h1 className="mb-4 text-lg font-black">{title}</h1>
            <p className="text-justify">{description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
               {tags.map((tag, i) => (
                  <div
                     key={i}
                     className="flex-shrink-0 rounded-lg bg-white-primary p-1 px-2 text-sm font-medium text-accent-orange dark:bg-white-secondary"
                  >
                     {tag}
                  </div>
               ))}
            </div>
         </div>
      </motion.div>
   );
};

export default ProjectCard;
