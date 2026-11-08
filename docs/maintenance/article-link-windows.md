# Article links in a separate browsing context

Scope: authored Markdown hyperlinks in article bodies open with target=_blank and rel=noopener noreferrer, including relative article links. Browser settings determine whether this is a new tab or window. The article's Back to blog and On this page controls retain ordinary navigation. This is a bounded renderer configuration adjustment; existing HTML skipping, URL sanitization, headings, and publication guards remain intact.

Acceptance: every authored body link has the target and security attributes, including internal/external references; destination/title/label preserved, while TOC fragments and Back to blog stay in the same context.

Verification: lint, TypeScript,21 unit tests, production build and diff checks passed. Focused production E2E article-rendering test passed with target/rel assertions for every body link and unchanged back-link behavior. Direct Chromium check on the saga article verified internal/external body link attributes; clicking the internal outbox link opened a separate browsing context with window.opener null while the original article remained open. Graphify refreshed751 nodes/978 edges. Local preview restarted3000; no deployment.
