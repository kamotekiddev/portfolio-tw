# Portfolio redesign

Direction: **Type and nothing else**, seed **15102026**. The accepted plan fixes Geist Sans, charcoal/emerald, both themes, section navigation, and three large featured projects. These take precedence over the random sheet's small work ledger, two-color headline, and email-led close. No redraws or external imagery.

Subject inventory: Joshua Dela Cruz; Kamote Kid / kamote.dev; San Juan, Metro Manila; frontend development; Chatio with Pusher; Jobseek's job/application workflows; WiseBites calorie tracking; React migrations at Questronix; Kabootek client projects; Cypress testing; real-time chart performance; existing portrait and nine project screenshots.

Idea: Joshua's progression from interface exercises to application workflows becomes a typographic introduction followed by a curated visual record of his work. The live interaction is an expandable archive of the earlier work, using native disclosure and real project links.

## Page argument and copy deck

- **Software engineer × AI engineer.** “I build React and Next.js products, and I’m focused on applying that software engineering foundation to useful AI experiences.” Actions: View work / Contact on LinkedIn.
- **Selected work.** “Product interfaces, API integrations, and real-time applications.” Chatio: real-time conversations with Pusher. Jobseek: finding, posting, and applying for jobs. WiseBites: daily calorie tracking against a target. Proof: existing screenshots and source repositories.
- **More projects.** Six additional applications and interface challenges, preserving their provenance and links.
- **Experience.** “Experience across interfaces, integrations, performance, and quality. Now bringing that foundation to AI engineering.” Four existing roles, their date ranges, and edited responsibilities; no new outcomes or metrics.
- **About me.** “I'm a software engineer focused on AI product work.” Focus: React, TypeScript, product workflows, API integration, performance, and reliability. AI engineering is presented as the current focus, not as shipped project experience.
- **Let's build something.** “Hiring for software or AI engineering, or planning a web project? Tell me what you're working on.” Action: Contact on LinkedIn.

## Baseline critique

ROUND 0
Seen in one second: centered name and a small circular portrait.
Idea (one sentence): a general personal introduction before a long résumé and project grid.
Live thing: theme toggle and outbound project links.
Layout words by section: hero=centered / about=paragraph / experience=timeline / work=masonry.
Scores: design 5.5 · usability 6 · creativity 5 · content 7 → overall 5.7.
Caps applied: baseline inspector reports gradients, resting shadows, and decorative rules.
Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. Desktop/mobile fold: no primary action and little engineering context; introduce a clear role and work/contact links.
2. Desktop page 1: project evidence follows a long résumé; bring three applications directly below the hero.
3. Desktop page 1: dense paragraphs and technology badges compete; edit copy and use shared alignments and simpler surfaces.

Only the existing project screenshots and portrait are used. No sample claims, generated assets, stock media, or third-party imagery. No video is added because no relevant owned footage is available; restrained image motion supplies the moving-image layer.

## Static layout review

ROUND 1
Seen in one second: the large frontend developer introduction.
Idea (one sentence): a typographic introduction gives way to Joshua's real application interfaces and professional record.
Live thing: native disclosure of six earlier projects, with real demo/source destinations.
Layout words by section: hero=statement / work=full-width-then-alternating / experience=record / about=portrait-and-copy / contact=statement.
Scores: design 7 · usability 8 · creativity 6 · content 8 → overall 7.2.
Caps applied: creativity is limited by the familiar portfolio concept; motion has not yet been added.
Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. Desktop page 2: too many closely related type sizes; consolidate into five semantic sizes.
2. Desktop page 1: static surfaces need subtle entrance choreography; add the planned headline and content motion with visible server-rendered fallbacks.
3. Inspector incorrectly measures closed disclosure children as covered text and an eyebrow; explicitly remove closed archive content from layout, then verify it when opened.

Link check: all nine demo URLs and all nine source repositories responded with HTTP 200 on 2026-10-15. SecuKey, Jobseek, and WiseBites redirect to sign-in pages. GitHub and Facebook profiles responded with HTTP 200. LinkedIn returned its automated-access block (999), so the supplied URL is preserved; no authenticated demo flows were tested.

## Final visual review

ROUND 2
Seen in one second: “Software engineer,” then a direct path to selected work.
Idea (one sentence): a clear typographic introduction leads into Joshua's own applications and career history.
Live thing: open the six-project archive to browse each project and its actual demo/source links.
Layout words by section: hero=statement / work=full-width-then-alternating / experience=record / about=portrait-and-capabilities / contact=statement.
Scores: design 7.5 · usability 8 · creativity 6 · content 8 → overall 7.4.
Caps applied: creativity remains at 6 because the opening claim also fits another software engineer. The one personal portrait and four real interface screenshots are the only relevant imagery available; no honest project footage exists.
Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. Desktop fold: “Software engineer” states the role; a narrower specialty would distinguish Joshua further, but the existing evidence offers several complementary skills rather than one clear specialty.
2. Desktop work section: screenshots include their original bright laptop/mockup backgrounds, creating contrast with the dark page. They are retained as supplied project images rather than altered to suggest a different product.
3. Contact section: LinkedIn is the only direct contact destination provided; add an email link if a public address becomes available.

Final verification: production build, ESLint, TypeScript, visual inspection, and interactive browser checks passed. Taste inspector: 0 FAIL and 2 justified media WARNs about adding further photography and video; neither is a factual fit for this portfolio. The separate responsive visual assessment is 7.4/10 because the opening claim could be more individual.

Positioning update: the headline now reads “Software engineer × AI engineer.” Supporting copy describes AI engineering as Joshua’s focus and connects it to documented product engineering experience. No AI tools, shipped AI products, or results were added without evidence. The 1440, 768, and 390 pixel check confirms the revised hero remains on two lines, with 0 inspector failures.

Final title edit: shortened the headline to “Software x AI Engineer” at Joshua’s request, retaining the two-line layout. Updated the page metadata and social preview to match.
