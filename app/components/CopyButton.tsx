"use client";
import { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { BiCopy, BiSolidCopy } from "react-icons/bi";
import { twMerge } from "tailwind-merge";

interface Props {
   text: string;
}

const CopyButton = ({ text }: Props) => {
   const [copied, setCopied] = useState(false);
   const handleCopy = () => {
      setCopied(true);
      setTimeout(() => {
         setCopied(false);
      }, 3000);
   };

   return (
      <CopyToClipboard text={text} onCopy={handleCopy}>
         <button
            className={twMerge(
               "grid h-7 w-7 place-items-center rounded-lg bg-accent-orange text-white",
               copied && "bg-green-500"
            )}
         >
            {copied ? <BiSolidCopy /> : <BiCopy />}
         </button>
      </CopyToClipboard>
   );
};

export default CopyButton;
