import { motion } from "framer-motion";
import techstacks from "@/data/techstacks";
import TechStack from "./TechStack";
import { fadeInAnimationVarints } from "@/libs/animation";

const TechStacks = () => {
   return (
      <section>
         <motion.h2
            variants={fadeInAnimationVarints}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="mb-8 inline-block text-3xl font-bold leading-none"
         >
            Technology Stack
         </motion.h2>
         <div className="flex flex-wrap gap-4">
            {techstacks.map((techStack, i) => (
               <TechStack key={i} delay={0.1 * i} techStack={techStack} />
            ))}
         </div>
      </section>
   );
};

export default TechStacks;
