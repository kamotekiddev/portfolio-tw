"use client";
import { motion } from "framer-motion";
import CopyButton from "@/components/CopyButton";
import SectionHeader from "./SectionHeader";

const ContactSection = () => {
   return (
      <div className="flex h-full flex-col justify-center">
         <div>
            <motion.div
               initial={{ scale: 0, opacity: 0 }}
               whileInView={{ scale: 1, opacity: 1 }}
               transition={{ delay: 0.5, type: "spring", duration: 0.5 }}
            >
               <SectionHeader>Contacts</SectionHeader>
               <p className="text-justify leading-loose">
                  Are you in search of a talented and experienced Frontend
                  Developer to elevate your digital presence? Look no further! I
                  am here to bring my skills and expertise to the table and help
                  you achieve your business goals. Just contact me right here.
               </p>
            </motion.div>
            <div className="my-6 h-px bg-neutral-500" />
            <motion.div
               initial={{ scale: 0, opacity: 0 }}
               whileInView={{ scale: 1, opacity: 1 }}
               transition={{ delay: 0.5, type: "spring", duration: 0.5 }}
            >
               <h2 className="mb-4 text-2xl font-black text-indigo-600 dark:text-indigo-500">
                  Email Address
               </h2>
               <div className="flex items-center gap-4">
                  <h3 className="text-lg font-medium ">
                     kamotekid.dev@gmail.com
                  </h3>
                  <CopyButton text="kamotekid.dev@gmail.com" />
               </div>
            </motion.div>
            <div className="my-6 h-px bg-neutral-500" />
            <motion.div
               initial={{ scale: 0, opacity: 0 }}
               whileInView={{ scale: 1, opacity: 1 }}
               transition={{ delay: 0.5, type: "spring", duration: 0.5 }}
            >
               <h2 className=" mb-4 text-2xl font-black text-indigo-600 dark:text-indigo-500">
                  Contact No
               </h2>
               <div className="flex items-center gap-4">
                  <h3 className="text-lg font-medium">09662048118</h3>
                  <CopyButton text="09662048118" />
               </div>
            </motion.div>
         </div>
      </div>
   );
};

export default ContactSection;
