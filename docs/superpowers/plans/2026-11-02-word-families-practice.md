# Word Families in Test and Writing

> Execute inline using the existing checkout. Preserve unrelated work.

**Goal:** Add an optional “Thêm Word Families” checkbox to Test setup and Writing for lessons with a Word Families table.

**Approach:** Extend the existing vocabulary pool with unique additional family forms, stable reserved IDs, and part-of-speech hints. Default remains the existing vocabulary. Use the same pool on the client and server; retain scope on saved requests/results and retries. Preserve the base vocabulary progress denominator.

**Checks:** Real generation and grading for all 50 lessons, both test formats, server validation, stable IDs, duplicate forms, saving/retrying, React rendering, complete test suite, lint, TypeScript, production build.

- [x] Add regression tests for pools, questions, grading and persisted scope.
- [x] Implement shared family pool generation and server selection/validation.
- [x] Add optional controls and scope-preserving reset/retry behavior to Test/Writing.
- [x] Show family metadata in questions/results and keep progress readable.
- [x] Run checks and review the implementation.

User confirmed merging family forms into the current practice. Review caught identical meaning/POS prompts for deductible and deduction; regression test now verifies both answers are accepted and shown.
