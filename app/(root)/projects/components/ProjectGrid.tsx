"use client";

import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import ProjectGridItem from "./ProjectGridItem";

interface Props {
   projects: Project[];
}

const ProjectGrid = ({ projects }: Props) => {
   return (
      <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 750: 2 }}>
         <Masonry gutter="1.5rem">
            {projects.map((project) => (
               <ProjectGridItem key={project.id} project={project} />
            ))}
         </Masonry>
      </ResponsiveMasonry>
   );
};

export default ProjectGrid;
