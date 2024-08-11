import AboutSection from "./components/AboutSection";
import HeroSection from "./components/HeroSection";
import ProjectsSection from "./components/ProjectsSection";

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
