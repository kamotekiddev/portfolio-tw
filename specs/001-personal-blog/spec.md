# Feature Specification: Personal Engineering Blog

**Feature Branch**: `codex/001-personal-blog`

**Created**: 2026-11-07

**Status**: Implemented (verification recorded in [tasks.md](tasks.md))

**Input**: User description: "I will start adding blog into this repo. I wanted to document what I learn, how I do my projects, what I encounter along the way etc etc."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Write and publish journal entries (Priority: P1)

As the portfolio owner, I want to document lessons, project walkthroughs, and problems I encounter so I can retain and share what I learn.

**Why this priority**: A repeatable publishing workflow is the foundation of the blog.

**Independent Test**: Use the authoring guide to create a draft, publish it, and revise it at the same address.

**Acceptance Scenarios**:

1. **Given** an entry with all required content, **When** the owner marks it published and publishes the site, **Then** readers can open its permanent address and read the supplied content.
2. **Given** a draft, **When** the site is published, **Then** its title, summary, and body are absent from public listings, discovery metadata, and direct public content addresses.
3. **Given** a published entry, **When** the owner updates its title or body without changing its address identifier and republishes, **Then** the original address displays the revision.
4. **Given** the authoring guide, **When** the owner adds headings, lists, links, an image with alternative text, inline code, and a code block, **Then** the published article renders each element correctly.

---

### User Story 2 - Discover recent writing (Priority: P1)

As a visitor, I want to find and browse the blog so I can learn what the author is building and discovering.

**Why this priority**: Writing must be discoverable from the existing portfolio.

**Independent Test**: Navigate from the home page to the blog and select an entry from a list containing multiple publication dates.

**Acceptance Scenarios**:

1. **Given** the portfolio home page, **When** a visitor follows the visible Blog link, **Then** they see published entries ordered newest first.
2. **Given** published entries, **When** the list is viewed, **Then** each entry displays its title, summary, publication date, optional topics, and a link to the article.
3. **Given** no published entries, **When** the blog is opened, **Then** it shows a clear empty state and navigation to the portfolio without fabricated posts.

---

### User Story 3 - Read and share technical writing (Priority: P2)

As a reader, I want readable articles at stable addresses so I can follow explanations, share them, and return later.

**Why this priority**: Technical content must remain useful across devices and outside the portfolio.

**Independent Test**: Open an article directly on mobile and desktop, inspect its sharing metadata, and navigate back to the blog.

**Acceptance Scenarios**:

1. **Given** a published address, **When** visited directly, **Then** the reader sees the title, publication date, optional topics, full body, and a link back to the blog.
2. **Given** a wide code sample on a narrow screen, **When** the article is read, **Then** whitespace is preserved and the sample remains accessible without causing horizontal scrolling of the whole page.
3. **Given** a published article, **When** its page metadata is inspected, **Then** its title, description, and canonical address identify that article at the intended site origin.
4. **Given** an unknown or draft address, **When** visited publicly, **Then** a not-found response provides navigation back to public content without revealing draft content.

### Edge Cases

- Duplicate address identifiers, missing required fields, invalid dates, and unsupported publication statuses produce actionable publishing validation errors identifying the affected entry.
- Equal publication dates use a documented deterministic order.
- A future date does not automatically publish a draft. Explicitly published entries with future dates remain visible; scheduled publishing is outside this version.
- Missing optional topics or imagery must not create broken or empty interface elements.
- Long titles, links, and wide code samples remain usable on small screens.
- With browser scripting disabled, blog navigation and full article content remain available.
- Draft content must not leak through publicly served content files or discovery surfaces.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The owner MUST be able to maintain posts in the repository independently of page presentation, with documented creation, preview, publishing, and revision steps.
- **FR-002**: Every post MUST have a title, unique stable address identifier, summary, publication date, body, and explicit draft or published status. Topics MUST be optional.
- **FR-003**: Publishing validation MUST reject missing required fields, duplicate identifiers, invalid dates, and unsupported statuses with errors identifying the entry and problem.
- **FR-004**: Only explicitly published entries MUST be publicly accessible or included in public listings and discovery metadata. Draft content MUST remain unavailable through direct public addresses and publicly served content files.
- **FR-005**: The portfolio MUST expose a visible Blog link. Blog pages MUST offer navigation back to the portfolio, and articles MUST link back to the blog list.
- **FR-006**: The blog index MUST list all published entries newest first with title, summary, publication date, optional topics, and an article link. Ties MUST have deterministic ordering.
- **FR-007**: Each published entry MUST have a permanent direct address that survives title and body edits unless the owner deliberately changes its identifier.
- **FR-008**: Article bodies MUST support paragraphs, heading hierarchy, ordered and unordered lists, links, images with alternative text, inline code, and whitespace-preserving code blocks.
- **FR-009**: Blog pages MUST preserve the existing visual direction, both themes, keyboard navigation, visible focus, reduced-motion preferences, and navigation and reading without browser scripting.
- **FR-010**: The index and articles MUST remain readable on mobile, tablet, and desktop, with no page-wide horizontal scrolling caused by article elements.
- **FR-011**: An empty blog MUST show an informative empty state. Unknown and draft article addresses MUST return not-found responses with navigation to public content.
- **FR-012**: Published articles MUST expose article-specific page titles, descriptions, and canonical addresses using the intended site origin.
- **FR-013**: Published content MUST reflect owner-supplied writing and assets. The feature MUST NOT publish invented experiences or project outcomes as factual personal posts.

### Key Entities *(include if feature involves data)*

- **Blog Post**: An owner-authored entry about learning, project work, or encountered problems, containing required publication information and a body, plus optional topics. No fixed article category is required.
- **Topic**: An optional descriptive label attached to a post, displayed for context without requiring filtering or a separate page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Following the authoring guide, the owner can add and publish an already-written entry within 10 minutes without editing page presentation.
- **SC-002**: A visitor can reach any listed article from the portfolio home page in at most two navigation actions.
- **SC-003**: Using at least three published entries and one draft as verification fixtures, every published entry appears in the documented order and the draft remains unavailable across all public listings, discovery surfaces, and direct public content addresses checked.
- **SC-004**: At viewport widths of 375, 768, and 1440 pixels, the index and a representative article have no page-wide horizontal overflow and remain usable in both themes, including code samples and keyboard navigation.
- **SC-005**: With scripting disabled, readers can navigate from the portfolio to an article and back and read the complete article body.
- **SC-006**: All checked missing-field, duplicate-identifier, invalid-date, and invalid-status cases fail with actionable errors; each checked published article exposes its own title, description, and canonical address.

## Assumptions

- This is a single-author public blog accompanying the existing portfolio. The owner edits content in the repository and uses the existing site release workflow.
- Initial scope covers authoring, draft control, a blog index, individual articles, and basic sharing metadata. Search, topic filtering, comments, reader accounts, newsletters, analytics changes, feeds, and scheduled publishing are deferred.
- Explicit publication status determines visibility; future dates do not provide scheduling.
- No final article text has been supplied. Temporary, clearly identified verification fixtures will not ship as factual personal writing.
- Existing portfolio content, project links, theme behavior, and design direction remain the baseline; this feature adds blog navigation and pages.
- The owner supplies factual writing, asset provenance, and alternative text. Content format and validation approach will be selected during planning within the constitution's constraints.
