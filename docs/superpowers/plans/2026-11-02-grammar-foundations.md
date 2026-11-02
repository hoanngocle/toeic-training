# Grammar Foundations Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for this continuation in the existing checkout.

**Goal:** Add the remaining five user-provided references to Ngữ Pháp.
**Architecture:** Extend the existing importer and catalog. Transcribe complete worked examples into existing BookUnit inline cloze format; reuse the current renderer, grading and persistence unchanged.
**Tech Stack:** Next.js 16, TypeScript, Python/pdfplumber, existing Supabase exercise workflow.
**Spec:** docs/superpowers/specs/2026-11-02-grammar-design.md, continuation section.

## Global Constraints
- Preserve all 115 source pages across nine categories as native content.
- Preserve original TOEIC questions and routes; no PDF embedding or invented examples.
- No new approval needed: user supplied the remaining sources for the same approved workflow.

## Review Focus
- Unformatted headings must still split lessons correctly.
- Wrapped table cells, multicolumn text and page continuations must retain source content.
- Cloze answers must correspond to worked source examples, not missing answer keys.
- Accept the two original mosquito plurals and common apostrophe variants.
- Category counts must update from data; no stale four-category label.

### Task 1: Import native foundation lessons
- [x] Extend coverage tests to nine categories, 115 pages and practice in all five new categories; observe failures.
- [x] Extend importer definitions and add scripts/grammar_foundations.py for source-based cloze units.
- [x] Audit all page text coverage, inspect representative rendered source pages and verify native tables.

### Task 2: Integration and verification
- [x] Update dynamic category count and Home label.
- [x] Run content/grading/persistence tests, ESLint, TypeScript and production build.
- [x] Independent read-only review; correct actionable findings.

## Ledger
- Existing implementation reused; unrelated changes preserved. No new worktree or commit.
- New sources contain 6 + 10 + 12 + 3 + 8 = 39 pages, with no embedded images.

- Complete: five new categories, 51 lessons, 84 source-based cloze questions; totals9 categories,87 lessons,112 questions and115 audited pages.
- Full verification:91/91 tests, targeted ESLint, TypeScript and production build passed.
- Independent review confirmed all84 answers against the supplied PDFs and zero missing source characters on all39 added pages. Fixed spurious tables in underlined verb prose, modal row pairs, empty phantom columns and22 unruled preposition tables (including page5 column alignment). No outstanding findings.
- Existing authentication and exercise persistence remain in use. No new logged-in browser session was available; no end-to-end UI claim is made. Temporary PDF-render files removed.
