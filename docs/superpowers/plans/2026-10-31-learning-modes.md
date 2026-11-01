# Learning Modes Implementation Plan

> Execute inline with superpowers:executing-plans; user explicitly requested implementation.

**Goal:** Ship three study modes and persistent personal results.
**Architecture:** Pure grading/question helpers, Node SQLite store, validated Next route, separate React components for each mode and history. Server recalculates grades; event IDs make save retries idempotent.
**Tech Stack:** Existing Next/React, Node 24 built-in SQLite, Node test runner.
**Spec:** docs/superpowers/specs/2026-10-31-learning-modes.md

## Constraints and review focus
- Preserve all existing lesson data and example toggles.
- Duplicate/synonymous answers must not yield ambiguous quiz choices.
- Storage failures must be visible and retryable without losing responses.
- Repeated submissions must not double-count progress.
- Progress must survive a database close/reopen.
- Empty answers, malformed payloads and unknown word IDs must not mutate storage.

## Tasks
- [x] 1. lib/learning/practice.ts: answer normalization, synonym splitting and quiz generation. Test real CSV lessons: 20 unique questions, 10 directions each, 4 nonoverlapping choices; grading aliases and wrong/empty answers.
- [x] 2. lib/learning/store.ts and app/api/learning/route.ts: validate requests, recompute results, transactionally save attempts/progress and read history. Test file-backed persistence, duplicate IDs, invalid input and lesson isolation.
- [x] 3. components/vocabulary/practice/*: FlashCard, Writing, Test and History. Wire tabs into lesson detail and style mobile/desktop. Retain in-progress state while changing tabs, stop audio on mode change.
- [x] 4. Run complete tests, lint, type checking and build when environment permits. Browser-check core flows. Add storage/backup documentation and final review.

## Execution notes
Existing directory is not a Git repository, so work directly in the authorized workspace without branch/commit steps. No dependency installs needed. Native SQLite API types are declared locally because the installed Node 20 type package predates the runtime's SQLite module.

## Verification and review outcome
- Seven automated tests pass, including repeated quiz generation across all 24 lessons and SQLite close/reopen persistence.
- ESLint and TypeScript pass.
- Browser verified Flash Card flip/rating, Writing in both directions, 20-question Test submission (4/20), retry of exactly 16 wrong words, and history persistence after reload.
- A separate reviewer found annotated individual Vietnamese meanings were rejected. Added a failing regression test, fixed parenthesis-aware splitting, and reran the complete suite successfully.
- At 390px width the Test page has no horizontal document overflow. Restored the browser's normal viewport.
- Four precisely identified browser QA sessions were removed; database now starts empty for personal use.
- Production build attempted with expanded execution permissions; blocked by the same environment port-binding restriction in Turbopack's CSS loader. No build success claimed.
- Next.js feedback pass: runtime configuration diagnostic was resolved immediately by following its guidance; port-binding failure is the known environment restriction. No new qualifying feedback candidates.
