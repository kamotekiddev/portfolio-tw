import AboutSection from "./components/AboutSection";
import HeroSection from "./components/HeroSection";
import ProjectsSection from "./components/ProjectsSection";
import ExperienceSection from "./components/ExperienceSection";
import ContactSection from "./components/ContactSection";

export default function Home() {
   return (
      <main id="main-content" tabIndex={-1}>
         <HeroSection />
         <ProjectsSection />
         <ExperienceSection />
         <AboutSection />
         <ContactSection />
      </main>
   );
}
