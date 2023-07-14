import React from "react";

interface Props {
   title: string;
   description: string;
   tags: string[];
}

const ProjectCard = ({ title, description, tags }: Props) => {
   return (
      <div className="shadow-md rounded-lg overflow-hidden cursor-pointer">
         <div className="bg-indigo-500 w-full h-[250px]"></div>
         <div className="p-4">
            <h1 className="font-black text-lg mb-4">{title}</h1>
            <p className="text-justify">{description}</p>
            <div className="flex gap-2 flex-wrap mt-4">
               {tags.map((tag, i) => (
                  <div
                     key={i}
                     className="p-1 px-2 text-sm font-medium flex-shrink-0 rounded-lg bg-indigo-50 text-indigo-600"
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
