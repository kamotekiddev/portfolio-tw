"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface Props {
   delay: number;
   image: string;
   title: string;
   description: string;
   tags: string[];
}

const Tag = ({ tag }: { tag: string }) => {
   return (
      <span className="flex-shrink-0 rounded-lg bg-white-primary p-1 px-2 text-sm font-medium text-accent-orange dark:bg-white-secondary">
         {tag}
      </span>
   );
};

const Tags = ({ tags }: { tags: string[] }) => {
   return (
      <section className="mt-4 flex flex-wrap gap-2">
         {tags.map((tag, i) => (
            <Tag key={i} tag={tag} />
         ))}
      </section>
   );
};

const ProjectGridItem = ({
   image,
   delay,
   title,
   description,
   tags = [],
}: Props) => {
   return (
      <motion.article
         initial={{ opacity: 0 }}
         whileInView={{ opacity: 1 }}
         transition={{ delay: (delay + 1) / 10, type: "just" }}
         className="h-max cursor-pointer overflow-hidden rounded-lg shadow-md"
      >
         <div className="relative h-[250px] w-full bg-accent-orange">
            <Image src={image} objectFit="cover" fill alt="Project Banner" />
         </div>
         <div className="p-4">
            <h1 className="mb-4 text-lg font-black">{title}</h1>
            <p className="text-justify">{description}</p>
            <Tags tags={tags} />
         </div>
      </motion.article>
   );
};

export default ProjectGridItem;
