"use client";
import { motion } from "framer-motion";
import TimelineCard from "./TimelineCard";
import experiences from "@/data/experiences";

const ExperienceTimeline = () => {
   return (
      <div className="relative ml-3 border-l border-gray-200">
         {experiences.map((experience, i) => (
            <motion.div
               key={i}
               initial={{ scale: 0, opacity: 0 }}
               whileInView={{ scale: 1, opacity: 1 }}
               transition={{
                  delay: (i + 2) / 10,
                  type: "spring",
                  duration: 2,
               }}
            >
               <TimelineCard
                  isActive={i === 0}
                  title={experience.title}
                  datetime={experience.datetime}
                  description={experience.description}
               />
            </motion.div>
         ))}
      </div>
   );
};

export default ExperienceTimeline;
