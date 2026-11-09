# Homepage content implementation

Scope: apply the owner-approved, interview-based copy in homepage-content-draft.md using the existing homepage structure and styles. This continues the copy maintenance change under the constitution's short-scope exception.

Acceptance: hero, project summaries, experience, biography, skills, AI copy, contact, metadata, and social preview match the approved draft. DXC is first with Software Engineer, Aug 2025–Present; freelance remains Software Developer, Dec 2024–Present with an occasional-side-projects qualifier. Kabootek appears once. Current AI-assisted development is distinct from planned and experimental AI product work. No editorial notes appear publicly. Existing project destinations and technologies are preserved.

Implementation: reuse the About capability-list layout for skills and AI subsections; add an optional experience engagement label for freelance. No new dependencies or interactive behavior.

Verification completed:

- Lint, production build (including blog validation), sequential TypeScript check, and git diff --check passed.
- Chromium checks at 390px, 768px, and 1440px in dark and light themes passed with no horizontal page overflow or browser runtime errors. Verified four correctly ordered employers, the freelance qualifier, and all five skill groups plus two AI groups.
- Inspected screenshots for hero, expanded About/AI content, experience, contact, and the generated social preview. Longer copy wraps within the existing layouts.
- Verified key content and the work anchor with JavaScript disabled. Browser matrix also exercised reduced-motion preferences.
- Atlas independently compared implementation with the approved draft; no findings.
- Graphify refreshed successfully. Browser evidence is saved locally in /tmp/portfolio-content-qa/.

The copy is implemented locally; no deployment was performed.

Follow-up: remove the redundant paragraph beside “What I’m building,” keeping the section heading and individual project descriptions. Verified: lint, build, TypeScript, and diff checks passed. Browser checks at 390px, 768px, and 1440px in both themes confirmed a heading-only introduction, preserved project summaries, and no page overflow. Graphify refreshed.

Layout comparison follow-up: restore the work introduction below the heading, left-aligned with a 60ch maximum line length and 16px separation. Scope styling to the work section. Verified: lint, build, TypeScript, and diff checks passed. Browser geometry confirmed the paragraph sits below and aligns with the heading at 390px, 768px, and 1440px in both themes without overflow; screenshots inspected. Graphify refreshed.

Final owner choice: remove the work introduction paragraph and its comparison-only styling. Keep the heading and project summaries. Lint, build, TypeScript, and diff checks passed; production HTML confirms removal. Restored the previously browser-verified heading-only layout. Graphify refreshed.

Proofreading: correct past-role tense, parallel phrasing, and awkward wording in the hero, biography, skills, AI, and project descriptions. Preserve approved facts, current-role tense, and the removed work introduction. Sync the Markdown draft. Verification: independent editorial review passed, as did lint, production build, TypeScript, and diff checks. Production HTML contains the corrected wording and still omits the removed work introduction. Graphify refreshed.

About copy refinement: replace the fundamentals/learning paragraph with a confident description of current technical focus, retaining the AI section’s planned/experimental qualifiers. Draft synchronized. Verified production HTML contains the new paragraph. Lint, build, TypeScript, and diff checks passed; Atlas reviewed the wording and Graphify update completed.

Final About refinement: generalize the focus paragraph to growth as a software engineer and work with AI, without naming technologies or architectural concepts. Draft synchronized. Verified production HTML, lint, build, TypeScript, and diff checks. Atlas reviewed the wording; Graphify update completed.

AI copy refinement: use “Working with AI,” general AI-assisted development wording, and exploratory AI product copy without named tools, processes, or projects. Draft synchronized; interview facts remain in editorial notes. Production HTML verified; lint, build, TypeScript, and diff checks passed. Atlas reviewed the wording; Graphify refreshed.

Heading refinement: shorten the experience heading to “Experience,” keeping the introduction and role descriptions. Draft synchronized. Production HTML confirmed the shorter heading. Lint, build, TypeScript, and diff checks passed; Graphify update completed.
