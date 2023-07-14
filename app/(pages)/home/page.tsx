import HeroSection from "../components/HeroSection";

const Home = () => {
   return (
      <main>
         <div id="home" className="h-[calc(100vh-64px)]">
            <HeroSection />
         </div>
         <div id="about" className="h-[calc(100vh-64px)]">
            <div>
               <h1 className="text-xl font-bold text-indigo-600">About</h1>
               <hr className="h-1 bg-indigo-600" />
            </div>
         </div>
         <div id="projects" className="h-[calc(100vh-64px)]">
            <div>
               <h1 className="mb-2 text-xl font-bold text-indigo-600">
                  Projects
               </h1>
               <hr className="h-1 bg-indigo-600" />
            </div>
         </div>
         <div id="contact" className="h-[calc(100vh-64px)]">
            <div>
               <h1 className="text-xl font-bold text-indigo-600">Contact</h1>
               <hr className="h-1 bg-indigo-600" />
            </div>
         </div>
      </main>
   );
};

export default Home;
