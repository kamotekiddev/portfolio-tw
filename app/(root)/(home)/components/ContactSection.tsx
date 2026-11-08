import { FiArrowUpRight } from "react-icons/fi";
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
               useful software.
            </h2>
            <div className="contact-bottom">
               <p>
                  I’m interested in software engineering and development
                  opportunities, including roles involving AI-enabled products.
                  If your team needs someone who enjoys designing solutions and
                  building across the stack, let’s talk.
               </p>
               <a
                  className="button"
                  href={contactLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
               >
                  Contact me on LinkedIn{" "}
                  <FiArrowUpRight aria-hidden="true" focusable="false" />
               </a>
            </div>
         </div>
      </section>
   );
}
