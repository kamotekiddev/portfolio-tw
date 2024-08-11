import { ComponentProps } from "react";
import { IconType } from "react-icons";

interface Props extends ComponentProps<"button"> {
   icon: IconType;
}

const IconButton = ({ icon: Icon, ...props }: Props) => {
   return (
      <button
         className="inline-grid h-8 w-8  place-items-center rounded-full border border-black-primary transition-all duration-300 ease-linear hover:border-accent-pink hover:text-accent-pink dark:border-white-primary dark:text-white-primary dark:hover:border-accent-pink dark:hover:text-accent-pink"
         {...props}
      >
         {<Icon className="h-4 w-4" />}
      </button>
   );
};

export default IconButton;
