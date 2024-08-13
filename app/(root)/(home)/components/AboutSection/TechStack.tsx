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
         initial={{ translateX: -50, opacity: 0, scale: 0 }}
         whileInView={{ translateX: 0, opacity: 100, scale: 1 }}
         transition={{ delay, duration: 0.1 }}
         viewport={{ once: true }}
         className="inline-flex items-center gap-2 rounded-full bg-white-secondary p-2 px-4 text-paragraph-1 dark:bg-accent"
      >
         <Icon size={22} className="flex-shrink-0" /> {techStack.name}
      </motion.span>
   );
};

export default TechStack;
