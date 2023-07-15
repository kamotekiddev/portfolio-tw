import React from "react";

interface Props {
   title: string;
   description: string;
   tags: string[];
}

const ProjectCard = ({ title, description, tags }: Props) => {
   return (
      <div className="cursor-pointer overflow-hidden rounded-lg shadow-md">
         <div className="h-[250px] w-full bg-indigo-500"></div>
         <div className="p-4">
            <h1 className="mb-4 text-lg font-black">{title}</h1>
            <p className="text-justify">{description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
               {tags.map((tag, i) => (
                  <div
                     key={i}
                     className="flex-shrink-0 rounded-lg bg-indigo-50 p-1 px-2 text-sm font-medium text-indigo-600"
                  >
                     {tag}
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
};

export default ProjectCard;
