import ReactMarkdown from "react-markdown";

export default function ArticleBody({ body }: { body: string }) {
   return (
      <div className="article-body">
         <ReactMarkdown
            skipHtml
            components={{
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
