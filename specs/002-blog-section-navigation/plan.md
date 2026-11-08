# Implementation Plan: Blog section navigation

**Branch**: feat/blog-section-navigation | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)

## Summary
Derive a high-level H2 section index from the same Markdown AST transformation that adds heading IDs. Render server-side native anchor navigation; sticky right sidebar next to body only, native details on narrow screens. Keep hero full width.

## Technical Context
TypeScript 5.1, Next.js 15 App Router, React 19, react-markdown 10, existing unified/remark-parse. No new dependencies, storage, external APIs or client bundle required. Tests use existing tsx node:test and Playwright. Scope is published article rendering only.

## Constitution Check
PASS before and after design: bounded requirements precede code; no factual content changed; no-JS semantic navigation, keyboard focus, both themes and responsive checks; existing architecture reused; tests and build required. No exceptions.

## Project Structure
- `app/data/article-headings.ts`: pure shared AST heading index/remark transform.
- `app/(root)/blog/components/ArticleBody.tsx`: use shared heading transform.
- `app/(root)/blog/components/ArticleContents.tsx`: accessible contents navigation.
- `app/(root)/blog/[slug]/page.tsx`: derive navigation, body grid.
- `app/globals.css`: responsive sidebar, compact details, target offset.
- `tests/article-headings.test.ts`: heading edge-case/parity regression.
- Feature docs under `specs/002-blog-section-navigation/`.

## Phases
1. Shared AST heading contract and tests (Anvil).
2. Navigation and responsive layout (Pixel, parallel after interface agreed).
3. Integration gates, browser/no-JS checks (Atlas/Echo), independent review (Sage).

## Complexity Tracking
No violations. No active-section tracking or client JavaScript introduced.
