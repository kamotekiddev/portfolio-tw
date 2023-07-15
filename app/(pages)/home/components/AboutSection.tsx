import ExperienceTimeline from "@/components/ExperienceTimeline";
import SectionHeader from "./SectionHeader";

const AboutSection = () => {
   return (
      <div>
         <div>
            <SectionHeader>About Me</SectionHeader>
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
         <div className="my-10">
            <h2 className="mb-8 text-2xl font-black text-indigo-600 dark:text-indigo-500">
               Technology Stack
            </h2>
            <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 sm:gap-6 md:flex md:flex-wrap md:justify-between md:gap-4">
               {Array.from(Array(18).keys()).map((number) => (
                  <div
                     key={number}
                     className="h-20 w-20 rounded-lg bg-indigo-600"
                  />
               ))}
            </div>
         </div>
         <div>
            <h2 className="mb-8 text-2xl font-black text-indigo-600 dark:text-indigo-500">
               Experiences
            </h2>
            <div>
               <ExperienceTimeline />
            </div>
         </div>
      </div>
   );
};

export default AboutSection;
