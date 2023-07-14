import React from "react";

const AboutSection = () => {
   return (
      <div>
         <div className="mb-10">
            <h1 className="text-3xl mb-8 font-black text-indigo-600 bg-indigo-50 p-2 px-4 rounded-lg w-max">
               About Me
            </h1>
            <p className="text-justify leading-loose">
               Hello, I&apos;m Joshua Dela Cruz, a passionate software engineer
               specializing in front-end development. With a strong dedication
               to detail and a focus on continuous growth, I am excited to
               contribute my expertise to impactful projects. I am actively
               seeking new opportunities to expand my skill set and advance my
               career as a software engineer. Let&apos;s collaborate and create
               remarkable solutions together!
            </p>
         </div>
         <div>
            <h2 className="text-indigo-600 mb-8 text-2xl font-black">
               Technology Stack
            </h2>
            <div className="flex gap-4 flex-wrap justify-between">
               {Array.from(Array(18).keys()).map((number) => (
                  <div
                     key={number}
                     className="w-20 h-20 rounded-lg bg-indigo-600"
                  />
               ))}
            </div>
         </div>
      </div>
   );
};

export default AboutSection;
