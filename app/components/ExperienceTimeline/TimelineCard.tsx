import { twMerge } from "tailwind-merge";

interface Props {
   isActive?: boolean;
   title: string;
   datetime: string;
   description: string;
}

const TimelineCard = ({ isActive, title, datetime, description }: Props) => {
   return (
      <li className="mb-10 ml-8">
         <span
            className={twMerge(
               "absolute flex items-center justify-center w-6 h-6 bg-indigo-100 rounded-full -left-3 ring-8 ring-white",
               isActive && "bg-indigo-600"
            )}
         />
         <h3 className="flex items-center mb-1 text-lg font-semibold text-gray-900">
            {title}
         </h3>
         <time className="block mb-2 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
            {datetime}
         </time>
         <p className="mb-4 text-base font-normal text-gray-500 dark:text-gray-400">
            {description}
         </p>
      </li>
   );
};

export default TimelineCard;
