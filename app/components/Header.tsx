import IconButton from "./IconButton";
import Logo from "./Logo";
import DarkModeToggle from "./DarkModeToggle";
import socialLinks from "@/data/social-links";

const Header = () => {
   return (
      <header className="sticky top-0 z-50 border-b border-b-black-secondary/10 backdrop-blur-lg dark:border-b-white-secondary/10">
         <nav className="mx-auto flex max-w-5xl items-center justify-between p-4">
            <div className="w-40">
               <Logo />
            </div>
            <div className="space-x-2">
               {/* {socialLinks.map(({ icon, link }, i) => (
                  <a href={link} target="_black" key={i}>
                     <IconButton icon={icon} />
                  </a>
               ))} */}
               <DarkModeToggle />
            </div>
         </nav>
      </header>
   );
};

export default Header;
