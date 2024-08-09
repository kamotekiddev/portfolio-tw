import Logo from "./Logo";

const Footer = () => {
   return (
      <div className="bg-white-secondary dark:bg-black-secondary">
         <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-4 p-4 text-center md:flex-row md:justify-between">
            <Logo />
            <p>Copyright © 2022 Joshua Dela Cruz - All rights reserved.</p>
         </div>
      </div>
   );
};

export default Footer;
