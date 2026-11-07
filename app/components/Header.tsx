import Link from "next/link";
import DarkModeToggle from "./DarkModeToggle";
import Logo from "./Logo";

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
            <DarkModeToggle />
         </div>
      </header>
   );
}
