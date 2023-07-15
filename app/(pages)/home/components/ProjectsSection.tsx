import ProjectCard from "@/components/ProjectCard";
import SectionHeader from "./SectionHeader";

const ProjectsSection = () => {
   return (
      <div>
         <SectionHeader>Recent Projects</SectionHeader>
         <div className="grid gap-4 md:grid-cols-2">
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
