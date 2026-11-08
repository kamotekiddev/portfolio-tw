import { FiArrowDownRight } from "react-icons/fi";
import { contactLinks } from "@/data/social-links";

export default function HeroSection() {
   return (
      <section className="hero content-width" aria-labelledby="hero-heading">
         <h1 id="hero-heading" className="hero-heading">
            <span className="hero-line">
               <span>Software</span>
            </span>{" "}
            <span className="hero-line">
               <span>Engineer</span>
            </span>
         </h1>
         <div className="hero-bottom">
            <p className="hero-intro">
               I’m Joshua Dela Cruz, a software engineer who enjoys designing
               systems and building applications. I build across the frontend
               and backend, compare technical approaches, and explore how AI can
               support both products and the development process.
            </p>
            <div className="hero-actions">
               <a className="button" href="#work">
                  Explore my work{" "}
                  <FiArrowDownRight aria-hidden="true" focusable="false" />
               </a>
               <a
                  className="text-link"
                  href={contactLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
               >
                  Let’s talk
               </a>
            </div>
         </div>
      </section>
   );
}
