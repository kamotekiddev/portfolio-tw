import Image from "next/image";
import portrait from "@/assets/profile.jpeg";

const capabilities = [
   {
      title: "Product engineering",
      description:
         "Responsive React and Next.js interfaces, TypeScript, and migrations from vanilla JavaScript.",
   },
   {
      title: "AI engineering focus",
      description:
         "Applying a software engineering foundation to useful AI product experiences and model-backed workflows.",
   },
   {
      title: "Performance",
      description:
         "Code splitting, optimistic updates, and reducing unnecessary renders in real-time charts.",
   },
   {
      title: "Testing & reliability",
      description:
         "End-to-end testing with Cypress, Lighthouse audits, semantic HTML, and search metadata.",
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
                  I’m a software engineer focused on AI product work.
               </p>
               <p>
                  I build product applications with React, Next.js, and
                  TypeScript. My experience spans real-time messaging, job
                  workflows, API integration, and modernizing web applications.
               </p>
               <p>
                  I’m extending that foundation into AI engineering: finding
                  useful roles for model capabilities and building the product
                  software around them. I care about clear workflows,
                  performance, and reliability.
               </p>
            </div>
         </div>
         <div className="capabilities">
            <h3>What I bring</h3>
            <dl className="capability-list">
               {capabilities.map(({ title, description }) => (
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
