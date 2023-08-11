import AboutSection from "./components/AboutSection";
import ContactSection from "./components/ContactSection";
import HeroSection from "./components/HeroSection";
import ProjectsSection from "./components/ProjectsSection";

const Home = () => {
   return (
      <main className="space-y-10">
         <section id="home" className="h-[calc(100vh-64px)]">
            <HeroSection />
         </section>
         <section id="about">
            <AboutSection />
         </section>
         <section id="projects">
            <ProjectsSection />
         </section>
         <section id="contact" className="h-[calc(100vh-64px)]">
            <ContactSection />
         </section>
      </main>
   );
};

export default Home;
