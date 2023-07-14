import AboutSection from "./components/AboutSection";
import HeroSection from "./components/HeroSection";

const Home = () => {
   return (
      <main>
         <div id="home" className="h-[calc(100vh-64px)]">
            <HeroSection />
         </div>
         <div id="about">
            <AboutSection />
         </div>
         <div id="projects"></div>
         <div id="contact"></div>
      </main>
   );
};

export default Home;
