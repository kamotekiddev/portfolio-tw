import { motion } from "framer-motion";
import TimelineCard from "./TimelineCard";

interface Props {
   experiences: Experience[];
}
const ExperienceTimeline = ({ experiences }: Props) => {
   return (
      <section className="ml-4">
         {experiences.map((experience, i) => (
            <motion.div
               key={i}
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               transition={{ delay: 0.5, type: "spring" }}
            >
               <TimelineCard isActive={i === 0} experience={experience} />
            </motion.div>
         ))}
      </section>
   );
};

export default ExperienceTimeline;
