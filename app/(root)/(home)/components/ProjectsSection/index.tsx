import Image from "next/image";
import projects from "@/data/projects";

function ProjectLinks({ project }: { project: Project }) {
   return (
      <div className="project-links">
         {project["live-link"] && (
            <a
               className="text-link"
               href={project["live-link"]}
               target="_blank"
               rel="noopener noreferrer"
               aria-label={`View ${project.projectTitle} ${project.liveLinkLabel || "live demo"}`}
            >
               {project.liveLinkLabel || "Live demo"}
            </a>
         )}
         {project["github-link"] && (
            <a
               className="text-link"
               href={project["github-link"]}
               target="_blank"
               rel="noopener noreferrer"
               aria-label={`View ${project.projectTitle} source on GitHub`}
            >
               View source
            </a>
         )}
      </div>
   );
}

export default function ProjectsSection() {
   const featured = projects
      .filter((project) => project.featuredOrder !== undefined)
      .sort((a, b) => a.featuredOrder! - b.featuredOrder!);
   const archive = projects.filter(
      (project) => project.featuredOrder === undefined
   );

   return (
      <section
         id="work"
         className="work-section content-width section-space"
         aria-labelledby="work-heading"
      >
         <div className="section-intro">
            <h2 id="work-heading">What I’m building</h2>
         </div>
         <div className="featured-projects">
            {featured.map((project, index) => (
               <article
                  className={`project project-${index === 0 || !project.projectImageBanner ? "lead" : "split"}`}
                  key={project.id}
                  aria-labelledby={`project-${project.id}`}
               >
                  {project.projectImageBanner && (
                     <div className="project-image" data-ui>
                        <Image
                           src={project.projectImageBanner}
                           alt={project.imageAlt || project.projectTitle}
                           width={1920}
                           height={1280}
                           sizes={
                              index === 0
                                 ? "(max-width: 1240px) calc(100vw - 40px), 1200px"
                                 : "(max-width: 767px) calc(100vw - 40px), (max-width: 1240px) 58vw, 696px"
                           }
                        />
                     </div>
                  )}
                  <div className="project-info">
                     <div className="project-title-block">
                        <h3 id={`project-${project.id}`}>
                           {project.projectTitle}
                        </h3>
                        <p className="project-kind">{project.projectKind}</p>
                     </div>
                     <div className="project-description">
                        <p>
                           {project.displaySummary ||
                              project.projectDescription}
                        </p>
                        <ul
                           className="project-stack"
                           aria-label={`${project.projectTitle} technologies`}
                        >
                           {Array.from(new Set(project.toolsUsed)).map(
                              (tool) => (
                                 <li key={tool}>{tool}</li>
                              )
                           )}
                        </ul>
                        <ProjectLinks project={project} />
                     </div>
                  </div>
               </article>
            ))}
         </div>
         {archive.length > 0 && (
            <details className="project-archive">
               <summary>
                  <span>
                     More projects{" "}
                     <span className="archive-count">({archive.length})</span>
                  </span>
                  <span className="disclosure-symbol" aria-hidden="true" />
               </summary>
               <div className="archive-list">
                  {archive.map((project) => (
                     <article className="archive-project" key={project.id}>
                        {project.projectImageBanner && (
                           <Image
                              src={project.projectImageBanner}
                              alt={project.imageAlt || project.projectTitle}
                              width={480}
                              height={320}
                              sizes="(max-width: 599px) calc(100vw - 40px), 220px"
                           />
                        )}
                        <div
                           style={
                              !project.projectImageBanner
                                 ? { gridColumn: "1 / -1" }
                                 : undefined
                           }
                        >
                           <h3>{project.projectTitle}</h3>
                           <p>
                              {project.displaySummary ||
                                 project.projectDescription}
                           </p>
                           <ProjectLinks project={project} />
                        </div>
                     </article>
                  ))}
               </div>
            </details>
         )}
      </section>
   );
}
