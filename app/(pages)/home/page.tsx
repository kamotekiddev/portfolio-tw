import AboutSection from "./components/AboutSection";
import HeroSection from "./components/HeroSection";
import ProjectsSection from "./components/ProjectsSection";

const Home = () => {
   return (
      <main>
         <div id="home" className="h-[calc(100vh-64px)]">
            <HeroSection />
         </div>
         <div id="about">
            <AboutSection />
         </div>
         <div id="projects" className="mt-20">
            <ProjectsSection />
         </div>
         <div id="contact"></div>
      </main>
   );
};

export default Home;
