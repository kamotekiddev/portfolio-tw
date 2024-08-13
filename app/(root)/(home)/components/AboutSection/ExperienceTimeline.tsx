import { motion } from "framer-motion";
import TimelineCard from "./TimelineCard";
import { fadeInAnimationVarints } from "@/libs/animation";

interface Props {
   experiences: Experience[];
}
const ExperienceTimeline = ({ experiences }: Props) => {
   return (
      <section className="ml-4">
         {experiences.map((experience, i) => (
            <motion.div
               key={i}
               variants={fadeInAnimationVarints}
               initial="initial"
               whileInView="animate"
               transition={{ delay: 0.3 * i, duration: 0.5 }}
               viewport={{ once: true }}
            >
               <TimelineCard isActive={i === 0} experience={experience} />
            </motion.div>
         ))}
      </section>
   );
};

export default ExperienceTimeline;
