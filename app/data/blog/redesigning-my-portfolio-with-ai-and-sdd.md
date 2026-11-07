---json
{
  "title": "Redesigning my portfolio with AI, then adding structure with SDD",
  "slug": "redesigning-my-portfolio-with-ai-and-sdd",
  "summary": "How this portfolio moved toward a clearer, project-focused design, and how I used spec-driven development to guide the blog that followed.",
  "publishedAt": "2026-11-07",
  "status": "published",
  "topics": ["Portfolio", "AI", "Spec-driven development"]
}
---

A portfolio gives me somewhere to show my projects. It can also show how I approach the work behind them: the decisions, the revisions, and the problems that appear along the way.

This project has given me a place to work with AI on that process. The visual redesign came first. Later, I added a more explicit development workflow with GitHub Spec Kit and used it to build this blog.

Those are two connected parts of the project, but they happened in that order. I did not write a specification afterward and pretend it had guided the original redesign.

## Giving the portfolio a clearer starting point

The earlier layout opened with a centered introduction and a small portrait, followed by a long résumé and project grid. The redesign notes identified a practical problem: the opening did not give visitors enough engineering context or a clear next action, and the project evidence appeared too far down the page.

The direction became typography-led: Geist Sans, charcoal and emerald, and a clearer path from the introduction to the work.

Three projects became the featured work:

- Chatio, with its real-time conversation interface and Pusher integration.
- Jobseek, with its job and application workflows.
- WiseBites, with its calorie-tracking interface.

Six earlier projects stayed available in an expandable archive. That let the featured work lead without removing the rest of the portfolio.

The existing portrait and project screenshots stayed in use. They already represented the actual work; the redesign did not need invented imagery or new project claims.

## Keeping AI work tied to concrete decisions

Working with an AI coding assistant creates plenty of opportunities to change things. For this repository, the useful constraints were specific: preserve the existing application, make the work easier to find, keep the content factual, and verify the result.

The design iterations addressed visible problems such as competing type sizes, dense copy, and the ordering of sections. The final structure put selected work near the introduction, followed by experience, about, and contact content.

There was also a content boundary to preserve. The headline became “Software x AI Engineer,” while the supporting copy described AI engineering as my current focus. That distinction matters: an interest or direction should not become a claim about shipped experience without evidence.

The same care applied to interaction. The earlier-project archive uses native disclosure, both themes remain available, and motion has visible content fallbacks. Reading the portfolio should not depend on an entrance animation finishing successfully.

## Adding spec-driven development after the redesign

When I started adding the blog, I had a different kind of problem to define. A blog needs more than an article layout. It needs a repeatable way to create posts, decide what is public, keep links stable, and catch invalid content before publishing.

I used spec-driven development, or SDD, to make those expectations explicit before implementation.

The repository's Spec Kit workflow is:

```text
specify → clarify when needed → plan → tasks → analyze → implement
```

Each step produces something reviewable:

1. The specification describes the user stories, scope, and observable behavior.
2. The plan chooses an implementation that fits the existing project.
3. The task list turns that plan into ordered work with verification steps.
4. Analysis checks that the specification, plan, and tasks agree.
5. Implementation follows the tasks and records what was actually checked.

The project constitution supplies the shared constraints: factual content, accessible experiences, simple architecture, and verification that matches the change.

For the blog, that meant keeping posts in the repository, separating content from presentation, and avoiding a CMS or database that the initial scope did not require.

## Turning “add a blog” into observable behavior

One requirement was that drafts must stay out of public content. Another was that an article's address should survive a title or body revision.

Those requirements led to explicit publication status and a stable slug. A post can have a future date and still be public if its status is `published`; a draft remains unavailable on the public site regardless of its date. Changing the title does not change the URL when the slug stays the same.

The implementation validates all posts, including drafts, before a production build. It checks required fields, real calendar dates, duplicate slugs, publication status, and the supported Markdown authoring rules.

This made the publishing workflow concrete enough to test. “Drafts stay out of the public site” became checks against listings, direct addresses, metadata, and public output rather than an assumption about how the page looked.

## Finding a problem after the build passed

A successful build did not prove every requirement was satisfied.

During production verification, an unknown blog address returned HTTP 404, but Next.js served its framework-level fallback instead of the nested blog not-found page. The status was correct; the required links back to the blog and portfolio were missing.

The fix was a shared not-found fallback with public navigation. A direct HTTP check then verified both the status and the links.

That is a useful example of why the acceptance criteria mattered. Without the navigation requirement, it would have been easy to stop at “the page returns 404.”

## Checking the result

For the blog implementation, verification included content and CLI tests, lint, TypeScript checking, and a production build.

The browser checks used temporary posts in an isolated copy of the project. They covered publishing a draft, revising a post at the same address, withdrawing it, and returning to an empty blog. They also checked both themes at mobile, tablet, and desktop widths, long titles and links, wide code blocks, keyboard navigation, and reading with JavaScript disabled.

Keeping those fixtures isolated mattered. Test content should exercise the blog without accidentally becoming my published writing.

## What I want to carry forward

The visual redesign gave the portfolio a clearer hierarchy. The blog work gave the repository a more explicit way to define and verify future changes with AI assistance.

I want to keep that combination: make the intent clear, give the assistant concrete constraints, review the implementation, and check the behavior people will actually use.

This blog is where I can document those decisions as the project develops, including the parts that need another attempt.
