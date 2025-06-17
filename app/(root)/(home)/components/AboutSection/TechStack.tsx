import { Stack } from "@/data/techstacks";
import { motion } from "framer-motion";

interface Props {
   techStack: Stack;
   delay?: number;
}

const TechStack = ({ techStack, delay }: Props) => {
   const Icon = techStack.icon;

   return (
      <motion.span
         initial={{ x: -50, opacity: 0, scale: 0 }}
         whileInView={{ x: 0, opacity: 100, scale: 1 }}
         transition={{ delay, duration: 0.3 }}
         viewport={{ once: true }}
         className="inline-flex items-center gap-2 rounded-full bg-white-secondary p-2 px-4 text-paragraph-1 dark:bg-accent"
      >
         <Icon size={22} className="shrink-0" /> {techStack.name}
      </motion.span>
   );
};

export default TechStack;
