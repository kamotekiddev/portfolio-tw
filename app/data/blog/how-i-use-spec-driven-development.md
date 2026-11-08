---json
{
  "title": "How I Use Spec-Driven Development for AI-Driven Development: Benefits and Tradeoffs",
  "slug": "how-i-use-spec-driven-development",
  "summary": "How I use specifications, plans, and tasks to guide AI-assisted development and where the process helps or adds overhead.",
  "publishedAt": "2026-11-08",
  "status": "published",
  "topics": ["Spec-Driven Development", "AI-Assisted Development", "Workflow"]
}
---

Writing code is only one part of building a feature. Deciding what it should do, agreeing on its boundaries, and knowing when it is complete take just as much care.

In this portfolio, I use spec-driven development (SDD) to make those decisions explicit before implementation. My setup uses GitHub Spec Kit, a project constitution, and feature documents that stay alongside the code. Here is how that workflow fits together, what I get from it, and the tradeoffs I need to manage.

## What is SDD?

Spec-driven development starts with a written description of the intended behavior. That specification explains the problem, who the change serves, what belongs in scope, and how to tell whether it works.

The specification then guides the technical plan, implementation tasks, and verification. When requirements change, the documents need to change with them.

A useful spec is concrete enough to challenge an implementation. “Add a blog” leaves many decisions open. “Show only published entries in the index, and return an unavailable page for draft addresses” gives me behavior I can actually check.

SDD does not require a particular tool or an AI coding agent. I use [GitHub Spec Kit](https://github.com/github/spec-kit) to give the process structure: a specification carried through planning, tasks, and implementation.

## How I use it in this project

I used SDD to build the blog feature on this portfolio—the feature serving this article. Its specification, implementation plan, and task list live in `specs/001-personal-blog/`. They define how posts are authored, which entries readers can access, and how the feature is verified.

My repository separates project principles from individual feature requirements. The constitution defines expectations that apply across changes: factual content, accessibility, simple architecture, and verification that matches the work. Each substantial feature gets its own scope and acceptance criteria.

The Spec Kit commands below are skill invocations that I enter one at a time in my coding agent's chat. The example prompts below show how I would request the blog feature; they are illustrative, not a transcript of the original session.

### Start with the outcome

I use `speckit-specify` to describe the desired behavior before making implementation choices. The resulting `spec.md` records user stories, requirements, and observable acceptance criteria.

For this blog feature, that meant deciding what readers could access and how publishing would work before deciding how to arrange the components. Questions such as whether a draft URL is reachable affect correctness, so they need an answer early. I use `speckit-clarify` when those kinds of questions remain unresolved.

For example:

```text
$speckit-specify Add a personal engineering blog to my portfolio.
Let me author posts in the repository, keep drafts private on the site,
and give published articles stable addresses.
```

The output is a feature specification under `specs/<feature>/spec.md`, plus a requirements-quality checklist. For this blog, the feature directory is `specs/001-personal-blog/`. Its `spec.md` contains three user stories: write and publish entries, discover recent writing, and read and share technical articles. It also defines requirements such as FR-004: only explicitly published entries can appear in public listings or be accessed directly.

If I need to resolve an ambiguity, I run:

```text
$speckit-clarify
```

This asks targeted questions, then records the answers in `spec.md` and updates the affected requirements. It does not create the blog UI. For example, clarifying whether a future publication date schedules a post would settle how publication dates affect visibility. This blog's final spec explicitly says publication status controls visibility and that scheduled publishing is outside the scope; that example is not a claim that the clarification command produced that decision in the original session.

### Turn the spec into a plan and tasks

Next, `speckit-plan` creates the technical approach in `plan.md`. This is where the existing Next.js structure, content boundaries, and verification approach belong.

Then `speckit-tasks` turns the plan into ordered work in `tasks.md`. I want each task to contribute to a requirement and have a clear way to verify completion.

Before implementation, `speckit-analyze` checks for inconsistencies across those artifacts. A requirement mentioned in the spec but missing from the tasks is easier to address at this point than after I have declared the feature complete.

For example:

```text
$speckit-plan Use the existing Next.js App Router and Markdown posts.
Keep content outside public/ and validate entries before production builds.
```

The main output is `plan.md`, which translates behavior into technical decisions. This blog's plan selects `app/data/blog/*.md` for content, `/blog` and `/blog/[slug]` for routes, and a server-only content adapter. Its supporting artifacts include:

- `research.md`: decisions and rationale, including publication rules.
- `data-model.md`: post fields and validation constraints.
- `contracts/blog.md`: public route and content behavior contracts.
- `quickstart.md`: authoring and verification steps.

These are design outputs, not evidence that the feature has already been implemented.

```text
$speckit-tasks
```

This produces `tasks.md` with ordered, checkable work, dependencies, and file paths. The blog's task list contains 30 tasks, covering content validation, routes, rendering, navigation, tests, documentation, and final verification. It also maps requirements and success criteria to the corresponding tasks, making missing coverage easier to spot.

```text
$speckit-analyze
```

The output is a review report identifying inconsistencies, ambiguities, duplicated requirements, or missing task coverage across `spec.md`, `plan.md`, and `tasks.md`. Analysis itself is read-only; it does not automatically fix those files. The blog's implementation evidence records how a heading-transition ambiguity was resolved in the data model and validation task before implementation continued.

### Implement against the agreed scope

I use `speckit-implement` to work through the tasks and record completion evidence. The feature documents live together under `specs/<feature>/`, so the intended behavior and implementation plan remain available in the repository.

```text
$speckit-implement
```

At this stage, the output includes actual code changes and updated task checkboxes, rather than another planning document. For this blog, the resulting files include the content parser and validator in `scripts/blog-content.ts`, the server-only adapter in `app/data/blog.ts`, the index and article routes, and the authoring guide in `docs/blog-authoring.md`.

The feature's `tasks.md` also records implementation and acceptance evidence: all 15 content tests and nine production-browser tests passed, along with lint checks, TypeScript checks, and a production build, when the feature was completed. Those are recorded results for the blog implementation, not a guarantee that every future invocation will pass or that every invocation runs all these checks.

Graphify supports this workflow by helping me discover existing code and relationships. It supplies implementation context; the constitution and feature spec define the intended outcome.

AI agents can help draft documents and implement tasks, but I still need to review the assumptions. A well-formatted spec can contain a bad decision just as easily as a short prompt can.

### Verify the behavior

For application changes, this project requires lint, TypeScript checking, and a production build. Meaningful behavior changes also need targeted regression coverage. Visual and interaction changes require browser checks, including responsive layouts and accessibility behavior.

Those checks answer different questions. A successful build shows that the application can be built; acceptance checks establish whether it does what the spec requires.

## The benefits

### Clearer boundaries

Writing down scope gives me a place to decide what the feature includes and what can wait. That matters when an AI agent could turn a small request into extra components, dependencies, or abstractions.

### Better context for AI-assisted work

A spec, plan, and task list provide persistent context across sessions and contributors. An agent can work from explicit requirements instead of reconstructing intent from a conversation. The benefit still depends on keeping that context accurate.

### More focused review and testing

Acceptance criteria give review a concrete target. I can ask whether a draft is excluded from public routes, rather than whether the implementation merely looks finished. They also help identify the regression checks that matter.

### Decisions stay close to the code

Keeping feature documents in the repository makes the reasoning available when the feature changes later. The documents can explain a boundary that would otherwise look arbitrary in the implementation.

## The drawbacks

### There is upfront work

Specifications, plans, and tasks take time to write and review. For uncertain or substantial behavior, that effort can expose missing decisions. For a typo, the same ceremony would be excessive.

My project explicitly allows small copy, documentation, and maintenance changes to use a short scope and verification note instead of a full feature workflow. This post is one such change.

### Human review takes time, especially after revisions

I still need to read the specification, plan, and tasks carefully. That means checking whether the requirements make sense, whether the technical approach fits the project, and whether the tasks cover the intended behavior. AI can generate these documents quickly, but reviewing them takes human attention.

When a revision changes the scope or approach, I may need to read the affected documents several times to check that they still agree. That review is a real cost of SDD and needs to be treated as part of the work, rather than as a quick approval before coding.

### Specifications can become stale

If implementation changes while the spec stays untouched, the repository contains conflicting accounts of the feature. Maintaining the documents is part of the work, including revisiting tasks and acceptance criteria when scope changes.

### Structure can create false confidence

A complete template is not proof that the requirements are good. AI-generated documents can repeat vague statements or agree with each other while missing an important user need. I need to question the content, not just check that every file exists.

### Planning can happen too early

Sometimes I need an experiment to understand what is feasible. Trying to finalize every technical detail before learning enough can lock in weak assumptions. A bounded investigation can inform the plan, and its findings may require revising the spec.

## Where I find the balance

I use the full workflow for features and material behavior changes and keep the process lighter for small edits. The useful measure is whether the documents help me make decisions and verify the result.

For me, SDD gives AI-assisted development a shared direction: define the outcome, make the work traceable to it, and check the finished behavior. Keeping that direction accurate still requires judgment throughout the work.
