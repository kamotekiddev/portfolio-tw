import ProjectCard from "@/components/ProjectCard";

const ProjectsSection = () => {
   return (
      <div>
         <h1 className="mb-8 w-max rounded-lg bg-indigo-50 p-2 px-4 text-3xl font-black text-indigo-600 dark:bg-indigo-600 dark:text-white">
            Recent Projects
         </h1>
         <div className="grid grid-cols-2 gap-4">
            <ProjectCard
               title="Kamote Chat"
               description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Itaque quam natus quasi dolorem nesciunt? Commodi possimus quam earum nulla ab?"
               tags={["Javascript", "Next Js", "React", "Tailwind Css"]}
            />
            <ProjectCard
               title="Kamote Chat"
               description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Itaque quam natus quasi dolorem nesciunt? Commodi possimus quam earum nulla ab?"
               tags={["Javascript", "Next Js", "React", "Tailwind Css"]}
            />
            <ProjectCard
               title="Kamote Chat"
               description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Itaque quam natus quasi dolorem nesciunt? Commodi possimus quam earum nulla ab?"
               tags={["Javascript", "Next Js", "React", "Tailwind Css"]}
            />
            <ProjectCard
               title="Kamote Chat"
               description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Itaque quam natus quasi dolorem nesciunt? Commodi possimus quam earum nulla ab?"
               tags={["Javascript", "Next Js", "React", "Tailwind Css"]}
            />
         </div>
      </div>
   );
};

export default ProjectsSection;
