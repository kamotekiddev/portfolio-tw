# Section navigation contract

`getArticleHeadings(body: string): ArticleHeading[]` and `remarkArticleHeadings` share the same visitor/slugger. Renderer assigns IDs through AST node data.hProperties.id. Navigation uses encoded fragment links matching those IDs. Navigation uses getArticleSections(body) to select H2 headings only, in order, without subsection indentation. All H2–H6 headings retain anchors. No heading means no navigation or grid gap. Only published article lookup can reach this UI.
