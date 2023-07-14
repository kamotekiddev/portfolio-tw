import { differenceInYears } from "date-fns";
import ButtonLink from "@/components/ButtonLink";

const HeroSection = () => {
   const birthday = new Date("2000-07-02");
   const age = differenceInYears(new Date(), birthday);

   return (
      <div className="h-full grid place-items-center">
         <div className="text-center">
            <h1 className="font-black text-4xl text-indigo-600">
               Joshua Dela Cruz
            </h1>
            <hr className="my-4 bg-indigo-600" />
            <p className="max-w-xl text-lg">
               A {age} years old passionate{" "}
               <span className="text-indigo-600 font-bold">
                  FRONT-END DEVELOPER
               </span>{" "}
               based in San Juan City Metro Manila Philippines
            </p>
            <hr className="my-4 bg-indigo-600" />
            <div className="space-x-4">
               <ButtonLink to="about">Me</ButtonLink>
               <ButtonLink to="projects">My Projects</ButtonLink>
               <ButtonLink to="contact">Connect with Me</ButtonLink>
            </div>
         </div>
      </div>
   );
};

export default HeroSection;
