import { createContext, PropsWithChildren, useContext, useState } from "react";

interface ShowHeaderLinksContextState {
   showHeaderSocialLinks: boolean;
   setShowHeaderSocialLinks: (value: boolean) => void;
}

const ShowHeaderLinksContext =
   createContext<ShowHeaderLinksContextState | null>(null);

export const useShowHeaderSocialLinks = () => {
   const ctx = useContext(ShowHeaderLinksContext);

   if (!ctx) throw new Error("Context only valid inside provider.");
   return ctx;
};

function ShowHeaderLinksProvider({ children }: PropsWithChildren) {
   const [showHeaderSocialLinks, setShowHeaderSocialLinks] = useState(false);

   return (
      <ShowHeaderLinksContext.Provider
         value={{
            showHeaderSocialLinks,
            setShowHeaderSocialLinks,
         }}
      >
         {children}
      </ShowHeaderLinksContext.Provider>
   );
}

export default ShowHeaderLinksProvider;
