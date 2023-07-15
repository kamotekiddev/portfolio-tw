import TimelineCard from "./TimelineCard";

// TODO add more into the description and add the actual tools used. what did I do in these experiences
const ExperienceTimeline = () => {
   return (
      <ol className="relative ml-3 border-l border-gray-200">
         <TimelineCard
            isActive
            delay={0}
            title="Frontend Developer (React)"
            datetime="From September 2022 - Present"
            description="Employed as a frontend developer @KabootekPH Inc."
         />
         <TimelineCard
            delay={0}
            title="Frontend Developer Intern (React)"
            datetime="From April 2022 - July 2022"
            description="Frontend Developer Intern @KabootekPH Inc."
         />
         <TimelineCard
            delay={0}
            title="Freelance Developer"
            datetime="From 2019 - 2022"
            description="Hired to help develop a thesis revision feature. @EARIST"
         />
      </ol>
   );
};

export default ExperienceTimeline;
