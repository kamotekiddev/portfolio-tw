import { FaFacebook, FaGithub, FaLinkedin } from "react-icons/fa";
import Logo from "./Logo";
import IconButton from "./IconButton";

const Footer = () => {
   return (
      <div className="flex items-center justify-between p-4">
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
