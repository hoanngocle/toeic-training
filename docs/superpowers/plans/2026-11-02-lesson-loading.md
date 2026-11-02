# Lesson detail loading implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Reduce work and transferred data when opening a vocabulary lesson.

**Architecture:** Cache public lesson JSX behind the existing authorization gate. Defer tab mounting and code loading, retaining mounted state. Split private progress and history reads.

**Tech Stack:** Next.js 16.4.3, React 19.3, TypeScript, Supabase, node:test.

**Spec:** `docs/superpowers/specs/2026-11-02-lesson-loading-design.md`

## Global constraints

- Preserve current authorization checks, drafts, grading, and completion indicators.
- Keep unrelated uncommitted work; reuse the current checkout and do not commit it.
- No additional production dependencies or database migrations.

## Review focus

- Previously opened tabs retain drafts and pending submissions.
- Remembered tabs mount correctly after hydration.
- History errors have their own retry; they do not hide progress.
- Saves invalidate history even when its tab is hidden.
- Cached lesson output contains no user data or grading solutions.

## Tasks

### 1. Defer tab rendering and cache public content

- [x] Add and run a failing isolated server-render regression for an Essential lesson: word list present, unopened exercise forms absent, initial HTML below 60 KB.
- [x] Add a shared deferred-content component that mounts on first activation and retains children thereafter. Apply to practice tabs and Essential units; dynamically import heavy practice components.
- [x] Cache public lesson JSX by slug with `cacheLife('max')`, keeping authorization outside it.
- [x] Run render regression and record before/after measurements.

### 2. Split progress and history loading

- [x] Add and run failing database-boundary tests for progress-only and history-summary reads, including account/lesson scope and provider errors.
- [x] Add `readLearningProgress` and `readLearningHistory`; route explicit views while preserving the default GET contract.
- [x] Load progress initially and history only inside its deferred tab. Refresh both after saves, without loading unopened history.
- [x] Run targeted tests.

### 3. Verify and review

- [x] Run the complete test suite, lint, and production build.
- [x] Obtain an independent code review of the scoped changes, addressing material findings.
- [x] Report render improvements and any validation limitations.

## Execution notes

The user requested immediate implementation of the already proposed approach. Continue without another design approval. The working tree includes substantial user changes; edits are applied in place and no commits are made.

## Validation results

- Observed SSR regressions fail before implementation, then pass. A further RED/GREEN test covers deferred collapsed examples.
- Final suite: `node --test tests/*.test.ts` — 109 passed, 0 failed.
- Final lint: `node node_modules/eslint/bin/eslint.js` — exit 0.
- Final production build: `node node_modules/next/dist/bin/next build` — exit 0, including TypeScript. Windows native locking required execution outside the sandbox. Build still logs an account-request warning during prerender; it is not a build failure.
- Independent review found no material bugs in the cache, deferred tabs, and split history/progress changes. Draft preservation and hydration were reviewed from source, not browser-tested.
- Isolated SSR, `essential-01`: 158,014 → 29,732 HTML bytes; 2,057 → 272 elements. Original `lesson-1`: 125,684 → 86,072 HTML bytes.
- These figures exclude Next RSC framing, network latency, and browser hydration. Authentication still gates navigation; the private progress API still authenticates independently. Live signed-in navigation and PostgREST responses were not measured.
