import projects from "@/data/projects";

import ProjectGrid from "./ProjectGrid";
import SectionHeader from "../(home)/components/SectionHeader";

const Projects = () => {
   return (
      <section className="mx-auto max-w-7xl p-4">
         <h1 className="mb-10 text-heading-1 font-black leading-none text-accent-orange">
            My Projects
         </h1>
         <ProjectGrid projects={projects} />
      </section>
   );
};

export default Projects;
