import CopyButton from "@/components/CopyButton";

const ContactSection = () => {
   return (
      <div className="h-[600px] flex flex-col justify-center">
         <div>
            <h1 className="text-3xl mb-6 px-4 font-black dark:bg-indigo-600 dark:text-white text-indigo-600 bg-indigo-50 py-2 rounded-lg w-max">
               Contacts
            </h1>
            <p className="leading-loose text-justify">
               Are you in search of a talented and experienced Frontend
               Developer to elevate your digital presence? Look no further! I am
               here to bring my skills and expertise to the table and help you
               achieve your business goals. Just contact me right here.
            </p>
         </div>
         <hr className="my-6" />
         <div>
            <h2 className="mb-4 font-black text-2xl text-indigo-600 dark:text-indigo-500">
               Email Address
            </h2>
            <div className="flex gap-4 items-center">
               <h3 className="font-medium text-lg ">kamotekid.dev@gmail.com</h3>
               <CopyButton text="kamotekid.dev@gmail.com" />
            </div>
         </div>
         <hr className="my-6" />
         <div>
            <h2 className=" mb-4 font-black text-2xl text-indigo-600 dark:text-indigo-500">
               Contact No
            </h2>
            <div className="flex gap-4 items-center">
               <h3 className="text-lg font-medium">09662048118</h3>
               <CopyButton text="09662048118" />
            </div>
         </div>
      </div>
   );
};

export default ContactSection;
