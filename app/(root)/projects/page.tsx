import projects from "@/data/projects";

import ProjectGrid from "./components/ProjectGrid";

const Projects = () => {
   return (
      <section className="mx-auto max-w-5xl p-4">
         <h1 className="mb-10 text-heading-4 font-black leading-none text-accent-orange">
            My Projects
         </h1>
         <ProjectGrid projects={projects} />
      </section>
   );
};

export default Projects;
