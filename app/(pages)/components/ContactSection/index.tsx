"use client";
import { motion } from "framer-motion";
import CopyButton from "@/components/CopyButton";
import SectionHeader from "../SectionHeader";
import CopyableItem from "./CopyableItem";

const ContactSection = () => {
   return (
      <section className="mx-auto max-w-7xl px-4 pb-40 pt-20">
         <div className="space-y-10">
            <motion.div
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               transition={{ delay: 0.5, duration: 0.5 }}
            >
               <SectionHeader>Contacts</SectionHeader>
               <p className="text-justify text-paragraph-1 leading-loose">
                  Are you in search of a talented and experienced Frontend
                  Developer to elevate your digital presence? Look no further! I
                  am here to bring my skills and expertise to the table and help
                  you achieve your business goals. Just contact me right here.
               </p>
            </motion.div>
            <motion.div
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               transition={{ delay: 0.5, duration: 0.5 }}
            >
               <h2 className="mb-4 text-heading-4 font-black">Email Address</h2>
               <div className="space-y-4">
                  <CopyableItem label="kamotekid.dev@gmail.com" />
                  <CopyableItem label="delacruzjoshua691@gmail.com" />
               </div>
            </motion.div>
            <motion.div
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               transition={{ delay: 0.5, duration: 0.5 }}
            >
               <h2 className="mb-4 text-heading-4 font-black">Contact No.</h2>
               <CopyableItem label="+63 966 2048 118" />
            </motion.div>
         </div>
      </section>
   );
};

export default ContactSection;
