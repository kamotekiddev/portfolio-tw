"use client";
import { motion } from "framer-motion";
import CopyButton from "@/components/CopyButton";
import SectionHeader from "./SectionHeader";

const ContactSection = () => {
   return (
      <div className="mx-auto flex h-full max-w-7xl flex-col justify-center">
         <div className="space-y-10">
            <motion.div
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               transition={{ delay: 0.5, duration: 0.5 }}
            >
               <SectionHeader>Contacts</SectionHeader>
               <p className="text-justify leading-loose">
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
                  <div className="flex items-center gap-4">
                     <h3 className="text-lg font-medium ">
                        kamotekid.dev@gmail.com
                     </h3>
                     <CopyButton text="kamotekid.dev@gmail.com" />
                  </div>
                  <div className="flex items-center gap-4">
                     <h3 className="text-lg font-medium ">
                        delacruz.joshua.dev@gmail.com
                     </h3>
                     <CopyButton text="delacruz.joshua.dev@gmail.com" />
                  </div>
               </div>
            </motion.div>
            <motion.div
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               transition={{ delay: 0.5, duration: 0.5 }}
            >
               <h2 className="mb-4 text-heading-4 font-black">Contact No.</h2>
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
