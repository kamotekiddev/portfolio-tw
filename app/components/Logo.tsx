import Link from "next/link";
export default function Logo() {
   return (
      <Link
         className="wordmark"
         href="/"
         aria-label="Joshua Dela Cruz, home"
      >
         Joshua Dela Cruz<span aria-hidden="true">.</span>
      </Link>
   );
}
