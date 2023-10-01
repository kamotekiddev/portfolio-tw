import AboutSection from "./components/AboutSection";
import HeroSection from "./components/HeroSection";
import ProjectsSection from "./components/ProjectsSection";

// TODO create a wrapper for the mouse spotlight effect

const Home = () => {
   return (
      <main>
         <section id="home" className="h-[calc(100vh-64px)]">
            <HeroSection />
         </section>
         <AboutSection />
         <ProjectsSection />
      </main>
   );
};

export default Home;
