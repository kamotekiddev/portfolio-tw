import { FaFacebook, FaGithub, FaLinkedin, FaSun } from "react-icons/fa";
import IconButton from "./IconButton";
import Logo from "./Logo";
import ScrollLink from "./ScrollLink";
import DarkModeToggle from "./DarkModeToggle";

const Header = () => {
   return (
      <header className="sticky top-0 z-50 backdrop-blur-lg">
         <nav className="p-4 flex items-center justify-between">
            <div className="w-40">
               <Logo />
            </div>
            <div>
               <ScrollLink to="home">Home</ScrollLink>
               <ScrollLink to="about">About</ScrollLink>
               <ScrollLink to="projects">Projects</ScrollLink>
               <ScrollLink to="contact">Contact</ScrollLink>
            </div>
            <div className="space-x-2">
               <IconButton icon={FaGithub} />
               <IconButton icon={FaFacebook} />
               <IconButton icon={FaLinkedin} />
               <DarkModeToggle />
            </div>
         </nav>
      </header>
   );
};

export default Header;
