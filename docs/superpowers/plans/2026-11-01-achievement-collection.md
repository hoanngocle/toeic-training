# Achievement collection implementation

Approved scope: 43 badges across sessions, distinct lessons, longest streak, ever-mastered word entries, full test submissions, distinct perfect tests and active days. Preserve unlocks and first earned date in Vietnam time. Reuse authenticated SQLite database and existing daily activity history. Render original scalable 2D badges with tier colors, wings and crowns.

- [x] Add behavior tests for distinct counts, earliest award dates, mastery followed by forgetting, retries, streak gaps and persistent awards.
- [x] Replay historical sessions chronologically and persist first award dates. Add server-derived full-test metadata and explicit retry references for vocabulary tests; infer legacy full tests from catalog size.
- [x] Replace single milestone strip with seven categories, 43 badges, accessible progress, earned dates and latest award.
- [x] Run tests, TypeScript, lint, build, browser checks and independent review.

Historical limitation: older vocabulary retries had no retry reference. Short submissions can be excluded using catalog size; full-sized retries cannot always be distinguished from full tests retrospectively.

Verified: full test suite 56 passed (including concurrently added account tests), TypeScript, lint and production build. Browser rendered 43 badges; earned/locked filters returned 2/41 for existing data; 390px viewport had no horizontal overflow. Independent review found no actionable issues.

Final workspace caveat: a later TypeScript run was blocked by concurrent tests/accounts.test.ts imports of missing lib/accounts/policy.ts and service.ts. The browser session was also redirected to login during concurrent account edits. No account implementation files were changed by this task. The earlier build and visual checks above completed before these concurrent changes.
