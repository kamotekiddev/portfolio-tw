import { FaFacebook, FaGithub, FaLinkedin } from "react-icons/fa";
import Logo from "./Logo";
import IconButton from "./IconButton";

const Footer = () => {
   return (
      <div className="flex flex-col items-center justify-center gap-4 p-4 text-center md:flex-row md:justify-between">
         <Logo />
         <p>Copyright © 2022 Joshua Dela Cruz - All rights reserved.</p>
         <div className="space-x-2">
            <IconButton icon={FaGithub} />
            <IconButton icon={FaFacebook} />
            <IconButton icon={FaLinkedin} />
         </div>
      </div>
   );
};

export default Footer;
