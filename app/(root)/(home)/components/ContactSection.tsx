import { contactLinks } from "@/data/social-links";

export default function ContactSection() {
   return (
      <section
         id="contact"
         className="contact-section"
         aria-labelledby="contact-heading"
      >
         <div className="content-width contact-inner">
            <h2 id="contact-heading">
               Let’s build
               <br />
               something.
            </h2>
            <div className="contact-bottom">
               <p>
                  Hiring for software or AI engineering, or planning a web
                  project? Tell me what you’re working on.
               </p>
               <a
                  className="button"
                  href={contactLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
               >
                  Contact on LinkedIn <span aria-hidden="true">↗</span>
               </a>
            </div>
         </div>
      </section>
   );
}
