import Link, { LinkProps } from "next/link";
import { twMerge } from "tailwind-merge";
import { HiOutlineExternalLink } from "react-icons/hi";
import { ComponentProps, PropsWithChildren } from "react";
import { cn } from "@/libs/utils";

interface Props {
   isActive?: boolean;
   experience: Experience;
}

interface CompanyLinkProps extends ComponentProps<"a"> {
   disabled?: boolean;
   href: string;
}

const CompanyLink = ({
   disabled,
   children,
   className,
   ...props
}: CompanyLinkProps) => {
   if (disabled)
      return (
         <div className="flex w-max cursor-not-allowed items-center gap-2 font-semibold opacity-50">
            <span>{children}</span> <HiOutlineExternalLink size={20} />
         </div>
      );

   return (
      <a
         className={cn(
            "flex w-max items-center gap-2 font-semibold hover:text-accent-pink hover:underline",
            className
         )}
         {...props}
      >
         <span>{children}</span> <HiOutlineExternalLink size={20} />
      </a>
   );
};

const TimelineCard = ({ experience, isActive }: Props) => {
   return (
      <article className="relative border-l border-accent-pink py-10 pl-10">
         <span
            className={twMerge(
               "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 ring-8 ring-white",
               isActive && "bg-accent-pink"
            )}
         />
         <div className="mb-4 space-y-2">
            <CompanyLink
               disabled={!experience.company.link}
               target="_blank"
               href={experience.company.link}
            >
               {experience.company.name}
            </CompanyLink>

            <h3 className="flex items-center text-heading-6 font-semibold">
               {experience.title}
            </h3>
            <time className="block text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
               {experience.datetime}
            </time>
         </div>

         <ul className="list-disc space-y-2">
            {experience.responsibilities.map((responsibility, idx) => (
               <li
                  key={idx}
                  className="text-paragraph-1 font-normal text-gray-500 dark:text-gray-400"
               >
                  {responsibility}
               </li>
            ))}
         </ul>
      </article>
   );
};

export default TimelineCard;
