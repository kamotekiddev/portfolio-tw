import { twMerge } from "tailwind-merge";

interface Props {
   isActive?: boolean;
   title: string;
   datetime: string;
   description: string;
}

const TimelineCard = ({ isActive, title, datetime, description }: Props) => {
   return (
      <article className="relative border-l border-accent-orange py-10 pl-10">
         <span
            className={twMerge(
               "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 ring-8 ring-white",
               isActive && "bg-accent-orange"
            )}
         />
         <h3 className="mb-1 flex items-center text-heading-6 font-semibold">
            {title}
         </h3>
         <time className="mb-4 block text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
            {datetime}
         </time>
         <p className="text-paragraph-1 font-normal text-gray-500 dark:text-gray-400">
            {description}
         </p>
      </article>
   );
};

export default TimelineCard;
