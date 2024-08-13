"use client";

import { AnimatePresence, motion } from "framer-motion";
import Logo from "./Logo";
import IconButton from "./IconButton";
import DarkModeToggle from "./DarkModeToggle";

import socialLinks from "@/data/social-links";
import { useShowHeaderSocialLinks } from "@/context/ShowHeaderLinksProvider";

const watterfallAnimationVariants = {
   initial: { translateY: -100 },
   animate: { translateY: 0 },
};

const Header = () => {
   const { showHeaderSocialLinks } = useShowHeaderSocialLinks();

   return (
      <header className="sticky top-0 z-50 border-b border-b-black-secondary/10 backdrop-blur-lg dark:border-b-white-secondary/10">
         <nav className="mx-auto flex max-w-5xl items-center justify-between p-4">
            <div className="w-40">
               <Logo />
            </div>
            <div className="flex gap-2">
               <AnimatePresence>
                  {showHeaderSocialLinks && (
                     <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 100 }}
                        exit={{ translateY: -100, opacity: 0 }}
                        transition={{ duration: 0.2, delay: 0.2 }}
                        className="hidden gap-2 sm:flex"
                     >
                        {socialLinks.map(({ icon, link }, i) => (
                           <motion.a
                              variants={watterfallAnimationVariants}
                              initial="initial"
                              animate="animate"
                              transition={{ delay: 0.2 * i, duration: 0.2 }}
                              href={link}
                              target="_black"
                              key={i}
                           >
                              <IconButton icon={icon} />
                           </motion.a>
                        ))}
                     </motion.div>
                  )}
               </AnimatePresence>
               <DarkModeToggle />
            </div>
         </nav>
      </header>
   );
};

export default Header;
