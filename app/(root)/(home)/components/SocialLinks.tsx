import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";

import socialLinks from "@/data/social-links";
import { fadeInAnimationVarints } from "@/libs/animation";
import IconButton from "@/components/IconButton";
import { useShowHeaderSocialLinks } from "@/context/ShowHeaderLinksProvider";

function SocialLinks() {
   const containerRef = useRef<HTMLDivElement>(null);
   const inview = useInView(containerRef, { margin: "-70px 0px -70px 0px" });
   const { setShowHeaderSocialLinks } = useShowHeaderSocialLinks();

   useEffect(() => {
      if (inview) setShowHeaderSocialLinks(false);
      else setShowHeaderSocialLinks(true);
   }, [inview, setShowHeaderSocialLinks]);

   return (
      <div ref={containerRef} className="space-x-2">
         {socialLinks.map(({ icon, link }, i) => (
            <motion.a
               variants={fadeInAnimationVarints}
               initial="initial"
               whileInView="animate"
               viewport={{ once: true }}
               transition={{ delay: 0.2 * i }}
               href={link}
               target="_black"
               key={i}
            >
               <IconButton icon={icon} />
            </motion.a>
         ))}
      </div>
   );
}

export default SocialLinks;
