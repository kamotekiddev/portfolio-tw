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
            className="mb-10 text-heading-5 font-black leading-none"
         >
            Experiences
         </motion.h2>
         <ExperienceTimeline experiences={experiences} />
      </section>
   );
};

export default Experiences;
