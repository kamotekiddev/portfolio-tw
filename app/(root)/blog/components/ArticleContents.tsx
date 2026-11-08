import { FiChevronDown } from "react-icons/fi";
import type { ArticleHeading } from "@/data/article-headings";

function SectionLinks({ headings }: { headings: ArticleHeading[] }) {
   return (
      <ol className="article-contents-list">
         {headings.map(({ id, text }) => (
            <li key={id}>
               <a href={`#${encodeURIComponent(id)}`}>{text}</a>
            </li>
         ))}
      </ol>
   );
}

export default function ArticleContents({ headings }: { headings: ArticleHeading[] }) {
   if (headings.length === 0) return null;

   return (
      <>
         <details className="article-contents-compact">
            <summary>
               On this page <FiChevronDown aria-hidden="true" focusable="false" />
            </summary>
            <nav aria-label="Article sections">
               <SectionLinks headings={headings} />
            </nav>
         </details>
         <aside className="article-contents-sidebar">
            <nav aria-label="Article sections">
               <p className="article-contents-title">On this page</p>
               <SectionLinks headings={headings} />
            </nav>
         </aside>
      </>
   );
}
