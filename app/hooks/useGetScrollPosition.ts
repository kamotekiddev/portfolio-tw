import { useEffect, useState } from "react";

const useGetScrollPosition = () => {
   const [position, setPosition] = useState({ x: 0, y: 0 });

   useEffect(() => {
      const handleScroll = () => {
         setPosition({ x: window.scrollX, y: window.scrollY });
      };

      window.addEventListener("scroll", handleScroll);

      return () => window.removeEventListener("scroll", handleScroll);
   }, []);

   return position;
};

export default useGetScrollPosition;
