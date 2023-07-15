import { ComponentProps } from "react";
import { IconType } from "react-icons";

interface Props extends ComponentProps<"button"> {
   icon: IconType;
}

const IconButton = ({ icon: Icon, ...props }: Props) => {
   return (
      <button
         className="inline-grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
         {...props}
      >
         {<Icon className="h-4 w-4" />}
      </button>
   );
};

export default IconButton;
