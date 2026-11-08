---json
{
  "title": "AI Can Make Development Faster. It Can Also Make It Exhausting.",
  "slug": "ai-assisted-development-cognitive-load",
  "summary": "AI can accelerate implementation while leaving developers with more review, more decisions, and more context switching. Faster output does not always mean a lighter working day.",
  "publishedAt": "2026-11-09",
  "status": "published",
  "topics": ["AI-Assisted Development", "Developer Experience", "Engineering Workflow"]
}
---

AI-assisted development can be stressful in a way that is easy to overlook: the work moves faster, but keeping up with it takes effort. Producing a change becomes easier while deciding whether that change is correct still demands concentration.

That tension is what I find exhausting. I value the speed, but I also feel the weight of the context switching and the decisions that come with it. A faster development process can still leave me mentally drained.

## The speed is useful, but it is only part of the work

An assistant can help turn an idea into a first implementation, suggest tests, explain unfamiliar code, or work through repetitive edits. Getting something concrete to inspect can shorten the distance between a requirement and a working solution.

There is research supporting speed improvements in particular settings. A randomized study involving 96 Google engineers found that AI assistance reduced time spent on an enterprise development task. The authors also caution that the result cannot simply be generalized across tools, tasks, and time. [Read the study on AI and development speed](https://arxiv.org/abs/2410.12944).

A quick implementation still has to be understood, checked, and integrated. Meaningful progress means a change the team can understand, verify, and maintain. Generating a larger diff does not automatically bring that point closer.

For me, the uncomfortable part is that more visible output does not necessarily mean less mental effort. More code can appear finished while more decisions remain open.

## The thinking moves into review

By cognitive load, I mean the amount of information and reasoning I need to keep active to do the work: the requirement, the relevant code, the assumptions behind a proposed change, and the consequences of accepting it.

Reviewing generated code can require reconstructing reasoning that would otherwise develop gradually while writing it. A change may look reasonable in isolation but depend on an assumption about authentication, data ownership, or error handling that the surrounding application does not support.

The questions accumulate. Does this solve the actual request? Is the abstraction necessary? Does the test check the intended behavior, or just repeat the implementation's assumptions? Will another developer understand this choice later?

In a 2025 survey, knowledge workers described a shift in critical-thinking activity toward verification, integration, and oversight when using generative AI. The study examined self-reported thinking and effort; it did not establish that AI increases developer exhaustion. Still, the shift it describes is relevant: producing an answer and taking responsibility for it involve different work. [Read the research on generative AI and critical thinking](https://www.microsoft.com/en-us/research/publication/the-impact-of-generative-ai-on-critical-thinking-self-reported-reductions-in-cognitive-effort-and-confidence-effects-from-a-survey-of-knowledge-workers/).

## Context switching becomes part of the workflow

The tiring switch is not always between two projects. It can happen inside one feature: describe the requirement, inspect a diff, interpret a failing test, clarify an assumption, review another result, then return to the original design decision.

Returning to a task means reconstructing the reasoning that was active before the interruption. The text may still be in the conversation, but finding it and recovering the context take effort.

Parallel agents can amplify this problem. Several tasks may progress at once, while their results still arrive at one person for review. A backend change, a UI proposal, and a test failure can each require a different mental model. The human reviewer cannot give all three full attention simultaneously.

A useful way to think about this is a queue: when new changes arrive faster than they can be understood and accepted, unfinished review accumulates. Keeping every agent busy can increase that queue without increasing completed work.

## A small example of how the load builds

Consider a hypothetical search feature with paginated results.

A developer asks an assistant to add a search filter. While the implementation runs, the developer starts a second task to improve the empty state and a third to update tests. Then three results arrive:

- The filter sends a URL query parameter to the server to search the full dataset.
- The empty state decides whether there are matches by filtering only the current page in the browser.
- The tests expect the URL to remain unchanged when the filter is applied.

Each result might seem plausible on its own. Together, they disagree about where searching happens and how the URL should behave. The developer has to settle those decisions, reconcile the changes, and explain the intended behavior again.

The cost is more than fixing a few lines. It includes holding three versions of the feature in mind long enough to make them agree. Adding another prompt may produce another answer before the underlying decision has been settled.

A more manageable version starts by deciding where filtering happens and what the URL should represent. Implementation and tests then share that decision. Parallel work becomes useful once the boundaries are clear enough that its results can be reviewed independently.

## The pressure to keep producing

There is also a psychological pressure in the workflow itself. When generating another change is easy, pausing to understand the current one can feel slow. An idle agent can look like wasted capacity, even when the developer needs uninterrupted time to review its last result.

I do not want faster tools to turn every quiet moment into another task to supervise. Time saved on implementation has value even when it becomes time to think, simplify a design, or finish the day with some energy left.

The responsibility for the result remains with the developer and the team. That makes attention a real constraint, even when generating code becomes inexpensive.

## When companies expect more because of AI

The pressure can also come from the organization. A company investing in AI tools may expect engineers to deliver more features, finish work sooner, or handle more tasks at once. If faster implementation becomes the basis for higher delivery targets, the time saved can disappear into a larger workload.

AI use is already an explicit workplace expectation in some companies. Shopify, for example, described it as a baseline expectation in its [account of its internal AI adoption](https://www.shopify.com/news/unserious-exploration). That policy alone does not establish how much pressure individual engineers experience. My concern is what happens when expectations about AI's capabilities become assumptions about a person's available capacity.

An illustrative planning mistake is to see an implementation finish sooner and immediately assign another feature, without accounting for the review, testing, integration, and maintenance still ahead. The engineer now has more code to understand and more decisions to carry, even though the original task looks nearly complete. If several tasks overlap, the increased workload also means more context switching.

That can create a difficult position: engineers are expected to move faster because they have AI, while remaining accountable for every defect and design decision in its output. Time spent verifying a change can start to look like a lack of productivity, even though that verification is part of delivering dependable software.

I want companies to recognize the full cost of the work when setting those expectations. Delivery targets should account for review effort, rework, reliability, and the team's ability to maintain what it ships. Engineers also need room to explain when a task requires sustained thought or when generated code creates more work than it saves.

Personal habits can help manage attention, but they cannot compensate indefinitely for a workload that keeps expanding. A sustainable use of AI requires managers and engineers to agree on a pace that includes the human work around the tools.

## Design the workflow around review capacity

My preference is to make the next review easier before asking for more output. That starts with the scope of the task and the decisions it leaves open.

Keep a task small enough to review as one coherent change. State the desired behavior and the important constraints before implementation. Ask the assistant to identify assumptions that affect correctness, especially when the repository cannot answer them.

For example, an illustrative request could be:

```text
Add the search filter using the existing URL query convention.

Keep the change limited to filtering behavior and its relevant tests.
Explain any assumption about where filtering runs before implementing it.

When finished, summarize:
- the behavior that changed;
- the files I should review first;
- the checks actually run and their results;
- any unresolved limitation.
```

The useful output is a bounded diff with a short review guide. The next step is to inspect the behavior and the evidence, then decide whether the change is complete. A summary helps locate the important parts; it does not replace reading them.

Limit concurrent tasks to what can actually be reviewed. Review nonurgent agent results at planned intervals where possible, and keep a written record of decisions rather than relying on memory across conversations. When an interruption is necessary, leave a brief note for yourself: what is settled, what is uncertain, and what to inspect next.

These habits have costs. Writing a clear task takes time, small changes may need more coordination, and pausing new work can leave tools idle. Those costs can be worthwhile when they prevent a larger pile of partially understood changes.

## A sustainable definition of faster

AI can reduce the effort of getting started and accelerate parts of implementation. It can also concentrate more review, coordination, and judgment into the same working day. Both experiences can be true at once.

I want the benefits of that speed. I also want to be able to explain the code, trust the checks, and keep enough attention for the next difficult decision. For me, a useful development workflow has to account for that human effort alongside the output it produces.
