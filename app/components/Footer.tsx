import Logo from "./Logo";
import IconButton from "./IconButton";
import socialLinks from "@/data/social-links";

const Footer = () => {
   return (
      <div className="bg-white-secondary dark:bg-black-secondary">
         <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-4 p-4 text-center md:flex-row md:justify-between">
            <Logo />
            <p>Copyright © 2022 Joshua Dela Cruz - All rights reserved.</p>
            <div className="space-x-2">
               {socialLinks.map(({ icon, link }, i) => (
                  <a href={link} target="_black" key={i}>
                     <IconButton icon={icon} />
                  </a>
               ))}
            </div>
         </div>
      </div>
   );
};

export default Footer;
