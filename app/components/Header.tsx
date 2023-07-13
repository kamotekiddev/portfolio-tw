import Link from "next/link";

const Header = () => {
   return (
      <header>
         <nav className="py-4 flex gap-2 justify-between">
            <div>
               <h1 className="text-2xl font-black">KKD</h1>
            </div>
            <div className="space-x-4">
               <Link href="/">Home</Link>
               <Link href="/">About</Link>
               <Link href="/">Projects</Link>
               <Link href="/">Contact</Link>
            </div>
            <div className="space-x-4 ">
               <button>G</button>
               <button>F</button>
               <button>L</button>
            </div>
         </nav>
      </header>
   );
};

export default Header;
