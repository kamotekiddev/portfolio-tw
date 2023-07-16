import TimelineCard from "./TimelineCard";

const ExperienceTimeline = () => {
   return (
      <ol className="relative ml-3 border-l border-gray-200">
         <TimelineCard
            isActive
            delay={0}
            title="Frontend Developer (React)"
            datetime="From September 2022 - Present"
            description="During my tenure as a junior Front-End Developer at KabootekPH Inc., I successfully converted numerous Figma designs into fully functional, interactive, and mobile-responsive web applications. Additionally, I adeptly integrated multiple REST APIs into these projects."
         />
         <TimelineCard
            delay={1}
            title="Frontend Developer Intern (React)"
            datetime="From April 2022 - July 2022"
            description="As an intern Front-End Developer at KabootekPH Inc., I had the opportunity to transform several Figma designs into fully functional, interactive, and mobile-responsive web applications. Throughout my internship, I gained hands-on experience in integrating REST APIs into these projects."
         />
         <TimelineCard
            delay={2}
            title="Freelance Developer"
            datetime="From 2019 - 2022"
            description="As a student at EARIST, I accepted a lot on thesis revision tasks for multiple groups. My main focus was on the backend development, where I implemented rules and permissions, handled pagination, sorting, and filtering of data, and enabled data export to Excel sheets."
         />
      </ol>
   );
};

export default ExperienceTimeline;
