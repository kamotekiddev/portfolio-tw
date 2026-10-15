import { contactLinks } from "@/data/social-links";

export default function HeroSection() {
   return (
      <section className="hero content-width" aria-labelledby="hero-heading">
         <h1 id="hero-heading" className="hero-heading">
            <span className="hero-line">
               <span>Software</span>
            </span>{" "}
            <span className="hero-line">
               <span>x AI Engineer</span>
            </span>
         </h1>
         <div className="hero-bottom">
            <p className="hero-intro">
               I build React and Next.js products, and I’m focused on applying
               that software engineering foundation to useful AI experiences.
            </p>
            <div className="hero-actions">
               <a className="button" href="#work">
                  View work <span aria-hidden="true">↘</span>
               </a>
               <a
                  className="text-link"
                  href={contactLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
               >
                  Contact on LinkedIn
               </a>
            </div>
         </div>
      </section>
   );
}
