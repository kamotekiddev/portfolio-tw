"use client";
import { motion } from "framer-motion";
import { twMerge } from "tailwind-merge";

interface Props {
   delay: number;
   isActive?: boolean;
   title: string;
   datetime: string;
   description: string;
}

const TimelineCard = ({
   delay,
   isActive,
   title,
   datetime,
   description,
}: Props) => {
   return (
      <motion.li
         initial={{ x: -1000, opacity: 0 }}
         whileInView={{ x: 0, opacity: 1 }}
         transition={{
            delay: (delay + 1) / 10,
            duration: (delay + 3) / 10,
            type: "just",
         }}
         className="mb-10 ml-8"
      >
         <span
            className={twMerge(
               "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 ring-8 ring-white",
               isActive && "bg-indigo-600"
            )}
         />
         <h3 className="mb-1 flex items-center text-lg font-semibold">
            {title}
         </h3>
         <time className="mb-2 block text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
            {datetime}
         </time>
         <p className="mb-4 text-base font-normal text-gray-500 dark:text-gray-400">
            {description}
         </p>
      </motion.li>
   );
};

export default TimelineCard;
