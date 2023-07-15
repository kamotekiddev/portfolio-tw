import AboutSection from "./components/AboutSection";
import ContactSection from "./components/ContactSection";
import HeroSection from "./components/HeroSection";
import ProjectsSection from "./components/ProjectsSection";

const Home = () => {
   return (
      <main className="space-y-20 px-4">
         <div id="home" className="h-[calc(100vh-64px)]">
            <HeroSection />
         </div>
         <div id="about">
            <AboutSection />
         </div>
         <div id="projects">
            <ProjectsSection />
         </div>
         <div id="contact">
            <ContactSection />
         </div>
      </main>
   );
};

export default Home;
