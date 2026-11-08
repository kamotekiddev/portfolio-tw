import Image from "next/image";
import portrait from "@/assets/profile.jpeg";

const capabilities = [
   {
      title: "Full-stack development",
      description:
         "I build frontend and backend applications using Next.js, Vite, .NET, and Node.js, with PostgreSQL for data storage. My experience includes building features, integrating APIs, debugging issues, and maintaining existing software.",
   },
   {
      title: "System design",
      description:
         "I enjoy comparing architectural options and thinking through how application components, services, and data fit together. I’m currently exploring microservices to deepen my understanding of different ways to structure a system.",
   },
   {
      title: "Testing",
      description:
         "I use Vitest and Jest for frontend testing, xUnit for .NET, and Jest for Node.js. My experience also includes Cypress end-to-end tests and application performance audits with Lighthouse and PageSpeed Insights.",
   },
   {
      title: "Development and deployment",
      description:
         "I use Docker for local development. I’ve also worked with AWS EC2, Azure App Service, Azure Function Apps, and GitHub Actions, including self-hosted runners.",
   },
   {
      title: "Mobile projects",
      description:
         "I’m developing mobile projects with Expo and React Native, using NativeWind and TanStack Query in BukidLink.",
   },
];

const aiPractices = [
   {
      title: "AI-assisted development",
      description:
         "I use AI to support my development workflow, guiding the work with clear requirements and checking the results against project standards.",
   },
   {
      title: "AI in products",
      description:
         "I’m exploring how AI can make software more useful and help people solve everyday problems.",
   },
];

export default function AboutSection() {
   return (
      <section
         id="about"
         className="about-section content-width section-space"
         aria-labelledby="about-heading"
      >
         <div className="about-top">
            <div className="about-portrait">
               <Image
                  src={portrait}
                  alt="Joshua Dela Cruz sitting in a café"
                  sizes="(max-width: 767px) calc(100vw - 40px), 340px"
               />
            </div>
            <div className="about-copy">
               <h2 id="about-heading">About me</h2>
               <p className="about-statement">
                  I enjoy figuring out how a system should work.
               </p>
               <p>
                  I’m a software engineer based in Metro Manila, currently
                  working at DXC Technology and occasionally taking on freelance
                  projects. I build full-stack applications with Next.js and
                  Vite on the frontend, .NET and Node.js on the backend, and
                  PostgreSQL for data storage.
               </p>
               <p>
                  The part I enjoy most is designing the solution: exploring
                  different architectures, comparing options, and deciding how
                  the pieces should fit together. I like thinking through an
                  approach before implementing it.
               </p>
               <p>
                  I’m focused on growing as a software engineer and expanding
                  how I work with AI to build useful, reliable software.
               </p>
            </div>
         </div>
         <div className="capabilities">
            <h3>From application code to delivery</h3>
            <dl className="capability-list">
               {capabilities.map(({ title, description }) => (
                  <div key={title}>
                     <dt>{title}</dt>
                     <dd>{description}</dd>
                  </div>
               ))}
            </dl>
         </div>
         <div className="capabilities">
            <h3>Working with AI</h3>
            <dl className="capability-list">
               {aiPractices.map(({ title, description }) => (
                  <div key={title}>
                     <dt>{title}</dt>
                     <dd>{description}</dd>
                  </div>
               ))}
            </dl>
         </div>
      </section>
   );
}
