import { motion } from "framer-motion";
import TimelineCard from "./TimelineCard";

interface Props {
   experiences: Experience[];
}
const ExperienceTimeline = ({ experiences }: Props) => {
   return (
      <section className="relative ml-3 border-l border-accent-orange">
         {experiences.map((experience, i) => (
            <motion.div
               key={i}
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               transition={{ delay: (i + 2) / 10, ease: "linear" }}
            >
               <TimelineCard
                  isActive={i === 0}
                  title={experience.title}
                  datetime={experience.datetime}
                  description={experience.description}
               />
            </motion.div>
         ))}
      </section>
   );
};

export default ExperienceTimeline;
