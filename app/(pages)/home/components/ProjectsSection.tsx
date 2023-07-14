import ProjectCard from "@/components/ProjectCard";

const ProjectsSection = () => {
   return (
      <div>
         <h1 className="text-3xl mb-8 font-black text-indigo-600 bg-indigo-50 p-2 px-4 rounded-lg w-max">
            Recent Projects
         </h1>
         <div className="grid gap-4 grid-cols-2">
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
