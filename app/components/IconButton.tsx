import { IconType } from "react-icons";

interface Props {
   icon: IconType;
}

const IconButton = ({ icon: Icon }: Props) => {
   return (
      <button className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white inline-grid place-items-center">
         {<Icon className="w-4 h-4" />}
      </button>
   );
};

export default IconButton;
