import Logo from "./Logo";
import MainNav from "./MainNav";
import SeasonPicker from "./SeasonPicker";
import ThemeToggle from "./ThemeToggle";

/** `current` names the site area the page belongs to, for the nav highlight. */
export default function Header({ current }: { current?: "home" | "blog" }) {
   return (
      <header className="site-header">
         <div className="header-inner content-width">
            <Logo />
            <MainNav current={current} />
            <div className="header-controls">
               <SeasonPicker />
               <ThemeToggle />
            </div>
         </div>
      </header>
   );
}
