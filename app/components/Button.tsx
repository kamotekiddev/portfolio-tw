import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { ComponentPropsWithRef, forwardRef } from "react";
import { cn } from "@/libs/utils";

export const buttonVariants = cva(
   "rounded-full uppercase p-2 px-4 h-max transition-colors duration-200 ease bg-black-primary text-white-primary hover:bg-black-secondary",
   {
      variants: {
         variant: {
            solid: "bg-black-primary hover:bg-transparent hover:text-black-primary border border-transparent hover:border-black-primary text-white-primary dark:bg-white-primary dark:text-black-primary dark:hover:bg-transparent dark:border-black-primary dark:hover:border-transparent dark:hover:text-white-primary dark:hover:border-white-primary",
            outline:
               "bg-transparnet text-black border border-black-primary hover:bg-black-primary hover:text-white-primary dark:hover:bg-white-primary dark:border-white-primary dark:text-white-primary dark:hover:text-black-primary",
         },
         size: {
            small: ["text-sm", "py-1", "px-2"],
            medium: ["text-base", "py-2", "px-4"],
            large: ["text-base", "py-4", "px-6"],
         },
      },
      defaultVariants: {
         size: "large",
         variant: "solid",
      },
   }
);

type ButtonWithRef = ComponentPropsWithRef<"button">;
export type ButtonProps = ButtonWithRef & VariantProps<typeof buttonVariants>;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
   ({ className, size, variant, ...props }: ButtonProps, ref) => {
      return (
         <button
            ref={ref}
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
         >
            {props.children}
         </button>
      );
   }
);

export default Button;
