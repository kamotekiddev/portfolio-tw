"use client";
import { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
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
               "bg-indigo-600 text-white py-px px-4 rounded-lg",
               copied && "bg-green-500"
            )}
         >
            {copied ? "Copied" : "Copy"}
         </button>
      </CopyToClipboard>
   );
};

export default CopyButton;
