"use client";
import { motion } from "framer-motion";
import ProjectCard from "@/components/ProjectCard";
import SectionHeader from "./SectionHeader";

const ProjectsSection = () => {
   return (
      <motion.div
         initial={{ x: -1000 }}
         whileInView={{ x: 0 }}
         transition={{ delay: 0.3 }}
      >
         <SectionHeader>Recent Projects</SectionHeader>
         <div className="grid gap-4 md:grid-cols-2">
            <ProjectCard
               delay={0}
               title="Kamote Chat"
               description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Itaque quam natus quasi dolorem nesciunt? Commodi possimus quam earum nulla ab?"
               tags={["Javascript", "Next Js", "React", "Tailwind Css"]}
            />
            <ProjectCard
               delay={1}
               title="Kamote Chat"
               description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Itaque quam natus quasi dolorem nesciunt? Commodi possimus quam earum nulla ab?"
               tags={["Javascript", "Next Js", "React", "Tailwind Css"]}
            />
            <ProjectCard
               delay={3}
               title="Kamote Chat"
               description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Itaque quam natus quasi dolorem nesciunt? Commodi possimus quam earum nulla ab?"
               tags={["Javascript", "Next Js", "React", "Tailwind Css"]}
            />
            <ProjectCard
               delay={4}
               title="Kamote Chat"
               description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Itaque quam natus quasi dolorem nesciunt? Commodi possimus quam earum nulla ab?"
               tags={["Javascript", "Next Js", "React", "Tailwind Css"]}
            />
         </div>
      </motion.div>
   );
};

export default ProjectsSection;
