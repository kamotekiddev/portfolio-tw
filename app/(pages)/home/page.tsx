import AboutSection from "./components/AboutSection";
import ContactSection from "./components/ContactSection";
import HeroSection from "./components/HeroSection";
import ProjectsSection from "./components/ProjectsSection";

const Home = () => {
   return (
      <main className="px-4">
         <div id="home" className="h-[calc(100vh-64px)]">
            <HeroSection />
         </div>
         <div id="about">
            <AboutSection />
         </div>
         <div id="projects" className="my-20">
            <ProjectsSection />
         </div>
         <div id="contact" className="mb-20">
            <ContactSection />
         </div>
      </main>
   );
};

export default Home;
