import experiences from "@/data/experiences";

export default function ExperienceSection() {
   return (
      <section
         id="experience"
         className="experience-section section-space"
         aria-labelledby="experience-heading"
      >
         <div className="content-width experience-layout">
            <div className="experience-intro">
               <h2 id="experience-heading">Experience</h2>
               <p>
                  I turn product requirements into application features, work
                  through technical problems, and improve existing systems. My
                  work brings together implementation, integration, testing, and
                  ongoing maintenance as requirements evolve.
               </p>
            </div>
            <div className="experience-list">
               {experiences.map((experience) => (
                  <article
                     className="experience-item"
                     key={`${experience.company.name}-${experience.title}`}
                  >
                     <div className="experience-topline">
                        <h3>
                           {experience.company.link ? (
                              <a
                                 className="text-link"
                                 href={experience.company.link}
                                 target="_blank"
                                 rel="noopener noreferrer"
                              >
                                 {experience.company.name}
                              </a>
                           ) : (
                              experience.company.name
                           )}
                        </h3>
                        <p className="experience-date">{experience.datetime}</p>
                     </div>
                     <p className="experience-role">
                        {experience.title}
                        {experience.engagement && ` · ${experience.engagement}`}
                     </p>
                     <ul>
                        {experience.responsibilities.map((item) => (
                           <li key={item}>{item}</li>
                        ))}
                     </ul>
                  </article>
               ))}
            </div>
         </div>
      </section>
   );
}
