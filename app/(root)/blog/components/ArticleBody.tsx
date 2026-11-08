import ReactMarkdown from "react-markdown";
import { remarkArticleHeadings } from "@/data/article-headings";

export default function ArticleBody({ body }: { body: string }) {
   return (
      <div className="article-body">
         <ReactMarkdown
            skipHtml
            remarkPlugins={[remarkArticleHeadings]}
            components={{
               a: ({ href, title, children }) => (
                  <a href={href} title={title} target="_blank" rel="noopener noreferrer">
                     {children}
                  </a>
               ),
               pre: ({ children }) => (
                  <pre tabIndex={0} aria-label="Code sample">
                     {children}
                  </pre>
               ),
            }}
         >
            {body}
         </ReactMarkdown>
      </div>
   );
}
