import { motion } from "framer-motion";
import techstacks from "@/data/techstacks";
import TechStack from "./TechStack";

const TechStacks = () => {
   return (
      <section>
         <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="mb-8 inline-block text-heading-5 font-black leading-none"
         >
            Technology Stack
         </motion.h2>
         <div className="flex flex-wrap gap-4">
            {techstacks.map((techStack, i) => (
               <TechStack key={i} delay={(i + 1) / 10} techStack={techStack} />
            ))}
         </div>
      </section>
   );
};

export default TechStacks;
