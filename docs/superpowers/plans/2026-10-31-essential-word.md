# Essential Word Implementation Plan

> **For agentic workers:** Use the approved spec and execute within this session. Independent UI and data integration work may run in parallel under dispatching-parallel-agents.

**Goal:** Ship all 50 Essential Word lessons with the book exercises inside the existing vocabulary UI.

**Architecture:** JSON manifest plus source-page images preserve book content. Shared vocabulary components recognize the source badge. A separate exercise model/API stores server-graded attempts and retries in SQLite.

**Tech Stack:** Next.js 16.4.3, React 19, TypeScript, Node 24 SQLite, Python PDFium, macOS Vision OCR.

**Spec:** docs/superpowers/specs/2026-10-31-essential-word.md

## Global Constraints
- Preserve ordinary vocabulary lessons and progress.
- All 50 lessons and 10 reviews; no invented book exercises.
- Badge is `Essential Word`; new tabs only for that source.
- Label synthetic audio; preserve source pictures and transcript.
- Work in supplied directory; it has no Git metadata.

## Review Focus
- 12-word tests must not advertise 20 questions or fail.
- Review results are shared across a five-lesson group without leaking into another group.
- Missing/duplicate/invalid answers cannot get a successful score.
- OCR key mismatches must fail import rather than silently fabricate answers.
- Source images and long transcripts remain accessible on narrow screens; speech stops on tab changes.

### Task 1: Source import and contracts
- [x] Add types for book sections, pages and question keys; failing tests for grouping and grading.
- [x] OCR source pages with bounding boxes, render authoritative source pages, import 600 terms and 10 review keys.
- [x] Validate 50 × 12 words, all section page assets, numbering and answer key coverage.

### Task 2: Shared vocabulary integration
- [x] Merge typed essential lessons into catalog without altering normal JSON.
- [x] Add source badge in cards and detail; extra accessible tabs use the essential section component.
- [x] Support essential slugs in persistence and correct variable-size Test labels, with tests.

### Task 3: Book exercises and persistence
- [x] Source-page viewer, part selection, transcript, explicit synthetic speech controls, answer sheet, submission and retry.
- [x] Server-validate and grade attempts against manifest; store/retrieve attempt history and group review results.
- [x] Test grading, malformed input, persistence, group isolation and duplicate submissions.

### Task 4: Verification
- [x] Run tests, lint, TypeScript and production build.
- [x] Inspect ordinary/essential lessons and an exercise submission in browser.
- [x] Independent code review, fix substantive findings, and record import limitations honestly.

## Progress
- Planning: complete. User approved reuse of the vocabulary interface and authorized implementation.

- Implementation: 50 lessons, 600 terms, 10 shared reviews, 1,940 unique graded questions.
- Verification: 21 tests pass; lint and TypeScript checked; production build succeeds. Browser verified ordinary versus Essential tabs, Word Families reference, 12-word Test, and submit/retry/history.
- Independent review: incomplete answer validation, empty family submission, and source key access findings resolved.
- Source quality: 101 transcript segments corrected against scans; original source images retained. Listening uses explicitly labeled synthetic speech.
- Build workaround: use a runtime-relative Python executable so Turbopack does not attempt to bundle a host interpreter symlink.
