import DarkModeToggle from "./DarkModeToggle";
import Logo from "./Logo";

export default function Header() {
   return (
      <header className="site-header">
         <div className="header-inner content-width">
            <Logo />
            <nav aria-label="Main navigation" className="main-nav">
               <a href="#work">Work</a>
               <a href="#experience">Experience</a>
               <a href="#about">About</a>
               <a href="#contact">Contact</a>
            </nav>
            <DarkModeToggle />
         </div>
      </header>
   );
}
