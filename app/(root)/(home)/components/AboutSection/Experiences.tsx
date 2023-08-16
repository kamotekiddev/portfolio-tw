import { motion } from "framer-motion";

import experiences from "@/data/experiences";
import ExperienceTimeline from "./ExperienceTimeline";

const Experiences = () => {
   return (
      <section>
         <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="mb-10 text-heading-5 font-black leading-none"
         >
            Experiences
         </motion.h2>
         <ExperienceTimeline experiences={experiences} />
      </section>
   );
};

export default Experiences;
