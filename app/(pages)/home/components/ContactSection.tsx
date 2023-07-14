const ContactSection = () => {
   return (
      <div className="h-[600px] flex flex-col justify-center">
         <div>
            <h1 className="text-3xl mb-6 px-4 font-black text-indigo-600 bg-indigo-50 py-2 rounded-lg w-max">
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
            <h2 className="font-black text-2xl text-indigo-600">
               Email Address
            </h2>
            <h3 className="font-medium text-lg">kamotekid.dev@gmail.com</h3>
         </div>
         <hr className="my-6" />
         <div>
            <h2 className="font-black text-2xl text-indigo-600">Contact No</h2>
            <h3 className="text-lg font-medium">09662048118</h3>
         </div>
      </div>
   );
};

export default ContactSection;
