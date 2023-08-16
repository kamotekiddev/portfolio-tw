import { motion } from "framer-motion";

interface Props {
   techStack: string;
   delay?: number;
}

const TechStack = ({ techStack, delay }: Props) => {
   return (
      <motion.span
         key={techStack}
         initial={{ scale: 0, opacity: 0 }}
         whileInView={{ scale: 1, opacity: 1 }}
         transition={{ delay, type: "spring" }}
         className="inline-block rounded-full bg-white-secondary p-2 px-4 text-paragraph-1 dark:bg-accent-orange"
      >
         {techStack}
      </motion.span>
   );
};

export default TechStack;
