import { cn } from "@/libs/utils";
import { ComponentProps } from "react";
import { HiOutlineExternalLink } from "react-icons/hi";

interface CompanyLinkProps extends ComponentProps<"a"> {
   disabled?: boolean;
   href: string;
   withIcon?: boolean;
}

function ExternalLink({
   disabled,
   children,
   className,
   withIcon = true,
   ...props
}: CompanyLinkProps) {
   if (disabled)
      return (
         <div className="flex w-max cursor-not-allowed items-center gap-2 font-semibold opacity-50">
            <span>{children}</span>{" "}
            {withIcon && <HiOutlineExternalLink size={20} />}
         </div>
      );

   return (
      <a
         className={cn(
            "flex w-max items-center gap-2 font-semibold hover:text-accent hover:underline",
            className
         )}
         {...props}
      >
         <span>{children}</span>{" "}
         {withIcon && <HiOutlineExternalLink size={20} />}
      </a>
   );
}

export default ExternalLink;
