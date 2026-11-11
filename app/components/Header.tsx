import Link from "next/link";
import Logo from "./Logo";
import SeasonPicker from "./SeasonPicker";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
   return (
      <header className="site-header">
         <div className="header-inner content-width">
            <Logo />
            <nav aria-label="Main navigation" className="main-nav">
               <Link href="/#work">Work</Link>
               <Link href="/#experience">Experience</Link>
               <Link href="/#about">About</Link>
               <Link href="/#contact">Contact</Link>
               <Link href="/blog">Blog</Link>
            </nav>
            <div className="header-controls">
               <SeasonPicker />
               <ThemeToggle />
            </div>
         </div>
      </header>
   );
}
