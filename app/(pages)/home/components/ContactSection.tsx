import CopyButton from "@/components/CopyButton";
import SectionHeader from "./SectionHeader";

const ContactSection = () => {
   return (
      <div className="flex h-[600px] flex-col justify-center">
         <div>
            <SectionHeader>Contacts</SectionHeader>
            <p className="text-justify leading-loose">
               Are you in search of a talented and experienced Frontend
               Developer to elevate your digital presence? Look no further! I am
               here to bring my skills and expertise to the table and help you
               achieve your business goals. Just contact me right here.
            </p>
         </div>
         <div className="my-6 h-px bg-neutral-500" />
         <div>
            <h2 className="mb-4 text-2xl font-black text-indigo-600 dark:text-indigo-500">
               Email Address
            </h2>
            <div className="flex items-center gap-4">
               <h3 className="text-lg font-medium ">kamotekid.dev@gmail.com</h3>
               <CopyButton text="kamotekid.dev@gmail.com" />
            </div>
         </div>
         <div className="my-6 h-px bg-neutral-500" />
         <div>
            <h2 className=" mb-4 text-2xl font-black text-indigo-600 dark:text-indigo-500">
               Contact No
            </h2>
            <div className="flex items-center gap-4">
               <h3 className="text-lg font-medium">09662048118</h3>
               <CopyButton text="09662048118" />
            </div>
         </div>
      </div>
   );
};

export default ContactSection;
