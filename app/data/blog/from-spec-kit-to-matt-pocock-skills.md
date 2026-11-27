---json
{
  "title": "Why I Switched from GitHub Spec Kit to Matt Pocock's Agent Skills",
  "slug": "from-spec-kit-to-matt-pocock-skills",
  "summary": "I moved my main AI-assisted development workflow from GitHub Spec Kit to Matt Pocock's agent skills. Here is how the two differ and why the smaller, composable approach suits me better.",
  "publishedAt": "2026-11-27",
  "status": "published",
  "topics": ["Spec-Driven Development", "AI-Assisted Development", "Workflow"]
}
---

Earlier this month I wrote about [how I use spec-driven development](/blog/how-i-use-spec-driven-development) with GitHub Spec Kit. I still think the ideas in that post are right: decide what a feature should do before building it, keep the work traceable to that decision, and verify the result.

What changed is the tool I use to do it. I have moved my main development workflow from [GitHub Spec Kit](https://github.com/github/spec-kit) to [Matt Pocock's skills](https://github.com/mattpocock/skills). This post explains how the two differ and why I now prefer Matt's.

## My Spec Kit workflow

My Spec Kit workflow was a fixed sequence of phases, each run as a separate skill, with clarify only when questions remained:

```text
specify → clarify → plan → tasks → analyze → implement
```

A project constitution held the rules for every change. Each feature got its own folder under `specs/<feature>/`, containing a `spec.md`, a `plan.md`, a `tasks.md`, and often supporting files such as `research.md`, `data-model.md`, contracts, and a quickstart.

In my earlier post I listed what this cost me. There was a lot of upfront work. I had to review several documents again whenever a revision changed the scope. Specs could go stale. A filled-in template could give me false confidence. Sometimes I was planning before I had learned enough to plan well. Those drawbacks are the main reason I started looking at something else.

## What Matt Pocock's agent skills are

Matt Pocock's repository is a collection of small agent skills for real engineering work. His README describes the difference from frameworks like Spec Kit directly: those approaches "try to help by owning the process," while his skills are meant to be "small, easy to adapt, and composable."

So instead of one pipeline there is a toolbox. Some skills are ones I invoke myself, such as `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/implement`. The agent can also reach for others on its own when the task fits, such as `tdd`, `diagnosing-bugs`, `prototype`, and `code-review`.

A typical feature for me now looks like this:

```text
/grill-with-docs   → get interviewed about the change until it is clear
/to-spec           → turn that conversation into a spec on the issue tracker
/to-tickets        → split the spec into vertical-slice tickets
/implement         → build it test-first, then review it
```

## The differences

### A fixed pipeline vs. skills chosen per change

- Spec Kit: every feature goes through the same phases in the same order, and each phase produces its own artifact.
- Matt's skills: I use the skills the change actually needs. Matt recommends starting every change with a grilling session, but after that it depends. Beyond the grilling, a hard bug might only need `diagnosing-bugs` and `tdd`. A large feature might use the whole chain.

### A template first vs. an interview first

- Spec Kit: `speckit-specify` drafts a specification from my prompt, and `speckit-clarify` asks questions afterwards if gaps remain.
- Matt's skills: the work starts with a grilling session. The agent interviews me until every branch of the design is resolved. Only then does `/to-spec` write the spec. Apart from confirming where the feature will be tested, it does not interview me again. It just puts together what we already agreed on.

### A constitution vs. a shared language

- Spec Kit: the constitution sets project-wide principles, and each feature's documents hold its own decisions.
- Matt's skills: `/grill-with-docs` builds a domain model as we talk. It keeps a `GLOSSARY.md` of the project's terms up to date and records hard-to-explain decisions as ADRs (architecture decision records). The agent and I end up using the same words for the same things.

### A specs folder vs. an issue tracker

- Spec Kit: specs, plans, and tasks are Markdown files in `specs/<feature>/`, next to the code.
- Matt's skills: I run `/setup-matt-pocock-skills` once per repository to choose an issue tracker (GitHub, GitLab, local files, or something else). Specs and tickets are then published there.

### A task checklist vs. a task graph

- Spec Kit: `tasks.md` is an ordered checklist of work, with file paths and notes on dependencies.
- Matt's skills: `/to-tickets` breaks a spec into tracer-bullet tickets. Each one is a narrow but complete slice through every layer, small enough to check on its own, and each lists the tickets that block it. `/implement-spec` can then work through the tickets that are ready, running them in parallel on separate branches.

### Working through a task list vs. building test-first

- Spec Kit: `speckit-implement` works through the task list and records completion evidence.
- Matt's skills: `/implement` uses test-driven development at the seams (the test boundaries) we agreed on earlier. It writes a failing test, then makes it pass, and leaves refactoring to the review stage. `/implement` then finishes with a two-part `code-review`: one part checks the code against the repository's standards, and the other checks it against the original spec.

## Why I prefer Matt Pocock's skills

### Less ceremony for small changes

With Spec Kit, process came by default and I had to decide when to skip it. With Matt's skills, I only use the skills a change needs, so small work stays small without me having to make an exception.

### Alignment before documents

Spec Kit's structure could make a feature look well defined just because every file existed. Grilling attacks the real problem, which is that the agent and I may not mean the same thing. Because the spec is written from an interview I have already answered, there are fewer decisions in it that I haven't thought through.

### Room to experiment before committing

I wrote before that planning can happen too early. The `prototype` skill builds a throwaway prototype to answer a design question first. That might be a single HTML file to test some logic, or a few very different UI variations. The spec can then record what the prototype taught me instead of a guess.

### Specs that go stale more slowly

`/to-spec` deliberately leaves out specific file paths and code snippets, because those go out of date quickly. Instead it records decisions: which modules change, their interfaces, and how they will be tested. That doesn't stop a spec from drifting, but it removes the details that drift fastest.

### A vocabulary that carries across sessions

The glossary is the part I'm most interested in. Matt's README argues that a shared language makes the agent less wordy, keeps names consistent across the code, and makes the codebase easier for the agent to navigate. A constitution tells the agent what rules to follow. A glossary tells it what my words mean.

### Clearer dependencies between tickets

Vertical slices, each naming the tickets that block it, are easier to reason about than one long checklist with dependency notes. Each ticket is sized to fit in a single fresh agent session, and the dependencies show which work can happen at the same time.

### Feedback built into the loop

TDD at agreed seams, regular type checks, and a review against both the standards and the spec give the agent feedback while it works, not only when it says it is done.

### Skills I can edit myself

Each skill is a short Markdown file. When a skill doesn't fit how I work, I can read it and adjust it, or tell the agent how I want it to behave. For example, I have my grilling sessions ask one question at a time. Fixing a step in a framework that owns the whole process is harder.

## What I gave up

The switch has costs, and I don't want to pretend otherwise.

- Unless I choose the local-files tracker, specs no longer sit in the repository next to the code. They live in whichever issue tracker I set up.
- Setup is per repository: an issue tracker, triage labels, and a place for the domain docs.
- More of the structure now depends on my judgment. A fixed pipeline at least made sure every step ran. With composable skills, I have to remember to grill before I build.

## Where I've landed

Spec-driven development gave me the habit of deciding before building. Matt Pocock's skills keep that habit but put the effort where it pays off: aligning with the agent, building a shared language, and keeping feedback loops tight. Specs still exist. They just come at the end of a conversation instead of at the beginning.

If you use Spec Kit and keep running into the same overhead I did, try `/grill-with-docs` on your next change before writing a spec. It's a small experiment, and it shows quickly whether the approach suits you.
