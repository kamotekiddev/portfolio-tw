import { motion } from "framer-motion";

import experiences from "@/data/experiences";
import ExperienceTimeline from "./ExperienceTimeline";
import { fadeInAnimationVarints } from "@/libs/animation";

const Experiences = () => {
   return (
      <section>
         <motion.h2
            variants={fadeInAnimationVarints}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="mb-10 text-heading-5 font-bold leading-none"
         >
            Experiences
         </motion.h2>
         <ExperienceTimeline experiences={experiences} />
      </section>
   );
};

export default Experiences;
