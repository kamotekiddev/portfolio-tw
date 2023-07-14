export default function Home() {
   return (
      <main>
         <div id="home" className="h-screen">
            <h1 className="text-xl font-bold text-indigo-600">Home</h1>
         </div>
         <div id="about" className="h-screen">
            <div>
               <h1 className="text-xl font-bold text-indigo-600">About</h1>
               <hr className="h-1 bg-indigo-600" />
            </div>
         </div>
         <div id="projects" className="h-screen">
            <div>
               <h1 className="mb-2 text-xl font-bold text-indigo-600">
                  Projects
               </h1>
               <hr className="h-1 bg-indigo-600" />
            </div>
         </div>
         <div id="contact" className="h-screen">
            <div>
               <h1 className="text-xl font-bold text-indigo-600">Contact</h1>
               <hr className="h-1 bg-indigo-600" />
            </div>
         </div>
      </main>
   );
}
