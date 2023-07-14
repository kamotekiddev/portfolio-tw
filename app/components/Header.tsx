import { FaFacebook, FaGithub, FaLinkedin, FaSun } from "react-icons/fa";
import Link from "next/link";
import IconButton from "./IconButton";
import Logo from "./Logo";

const Header = () => {
   return (
      <header className="sticky top-0 bg-white">
         <nav className="py-4 flex gap-2 justify-between">
            <div>
               <Logo />
            </div>
            <div className="space-x-4">
               <Link href="/">Home</Link>
               <Link href="/">About</Link>
               <Link href="/">Projects</Link>
               <Link href="/">Contact</Link>
            </div>
            <div className="space-x-2 ">
               <IconButton icon={FaGithub} />
               <IconButton icon={FaFacebook} />
               <IconButton icon={FaLinkedin} />
               <IconButton icon={FaSun} />
            </div>
         </nav>
      </header>
   );
};

export default Header;
