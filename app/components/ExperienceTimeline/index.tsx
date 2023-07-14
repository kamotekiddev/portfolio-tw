import TimelineCard from "./TimelineCard";

const ExperienceTimeline = () => {
   return (
      <ol className="relative border-l ml-3 border-gray-200">
         <TimelineCard
            isActive
            title="Frontend Developer (React)"
            datetime="From September 2022 - Present"
            description="Employed as a frontend developer @KabootekPH Inc."
         />
         <TimelineCard
            title="Frontend Developer Intern (React)"
            datetime="From April 2022 - July 2022"
            description="Frontend Developer Intern @KabootekPH Inc."
         />
         <TimelineCard
            title="Freelance Developer"
            datetime="From 2019 - 2022"
            description="Hired to help develop a thesis revision feature. @EARIST"
         />
      </ol>
   );
};

export default ExperienceTimeline;
