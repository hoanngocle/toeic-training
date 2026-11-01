# Supabase Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Admin-managed accounts with isolated, durable learning data on Vercel.
**Architecture:** Supabase SSR Auth, server-authorized admin APIs, PostgreSQL transactional writes and RLS reads. Preserve grading rules and Vietnamese UI.
**Tech Stack:** Next.js 16.4.3, Supabase JS/SSR, SQL migrations, Node tests, PGlite for real PostgreSQL policy/transaction tests.
**Spec:** `docs/superpowers/specs/2026-11-01-supabase-accounts-design.md` (approved).

## Global Constraints
- No public signup; learner profiles cannot edit roles or results.
- Keep unrelated uncommitted work, including achievements.
- Server secrets never reach browser bundles or logs.
- Cloud configuration requires actual access; do not claim cloud validation from local tests.

## Review Focus
- Existing tokens after locking: profile checks and RLS deny them (Task 1/2).
- Duplicate simultaneous saves: exactly one progress update (Task 3).
- Reset failures: do not report success or expose passwords (Task 2).
- Partial/missing legacy tables: dry run and transactional, repeatable import (Task 4).
- Missing Supabase env during build: lazy configuration, helpful setup error (Task 2/5).

### Task 1: Database schema and authorization
Files: `supabase/migrations/202611010001_accounts.sql`, `tests/supabase-db.test.ts`.
Interfaces: profiles(id, role, disabled); per-user sessions/progress/essential_sessions/activity_days; service-only `save_learning(p_user_id,p_request,p_result)` and `save_exercise(p_user_id,p_request,p_result)` returning stored JSON result.
- [x] Write tests: RLS read isolation, write denial, locked users, transaction rollback, duplicate/conflicting IDs, cross-user retry parent; run and observe missing migration failure.
- [x] Implement migration with profile trigger, RLS and transactional writes serialized on profile row; public/anon/authenticated cannot execute write functions.
- [x] Run Node PostgreSQL tests; expected pass.

### Task 2: Authentication and admin accounts
Files: `lib/supabase/{config,server,admin}.ts`, `lib/accounts/{policy,service}.ts`, `lib/auth-server.ts`, `lib/auth.ts`, `proxy.ts`, auth/admin routes, login form, admin page/component, shell/account menu.
Interfaces: `getCurrentUser(): Promise<AppUser|null>`, `requireUser(): Promise<AppUser>`, `requireAdmin(): Promise<AppUser>`; `AppUser={id,email,role}`. Policy functions validate email/password/actions and forbid admin mutations.
- [x] Test policy and admin service with injected provider: invalid credentials/input, non-admin access, missing/locked profile, duplicate email, provider reset errors, self/admin mutation forbidden.
- [x] Observe tests fail; add Supabase clients, lazy config, verified identity/profile checks and cookie refresh, login/logout.
- [x] Implement admin APIs and responsive UI, profile trigger populates email for paginated listing; no role changes exposed.
- [x] Run tests and typecheck; expected pass.

### Task 3: Cloud learning stores
Files: `lib/learning/grading.ts`, `lib/essential/grading.ts`, `lib/supabase/learning.ts`, learning/essential routes and achievements page.
Interfaces: asynchronous reads/saves accept verified user ID and user-scoped client; writes use service-only RPC. Keep old SQLite store only for legacy tests/import compatibility.
- [x] Test existing grading equivalence and cross-user retry behavior; observe new interfaces missing.
- [x] Extract pure grading from SQLite stores; cloud stores reuse it and normalize requests. Paginate days, maintain exact history/count semantics.
- [x] Switch runtime routes to cloud stores with session-derived IDs, no-store responses and shared errors.
- [x] Run full Node tests; expected pass, including original 46 tests adjusted for retired HMAC auth.

### Task 4: Legacy import and setup
Files: `scripts/import-learning.ts`, `lib/supabase/legacy.ts`, import migration RPC, `docs/supabase-setup.md`, `.env.example`, README.
- [x] Test empty/partial SQLite snapshot, exact repeat import, conflict rollback and explicit admin target.
- [x] Implement read-only SQLite export, default dry run, explicit `--apply`, one transaction import with conflict checks and no overwrite or delete.
- [x] Document exact dashboard steps: disable signup, migration, initial user+admin UUID, keys, Vercel redeploy and optional import.
- [x] Run import and database tests; expected pass. Cloud execution only with actual connection credentials.

### Task 5: Integration and review
- [x] Run full suite, lint, TypeScript, production build; inspect UI login/admin using local preview when possible.
- [x] Fresh reviewer checks whole implementation, especially RLS, privileged RPCs, blocked accounts and preserve existing grading behavior.
- [x] Fix significant findings with regression tests; report verified scope and remaining cloud setup precisely.

## Execution ledger
- Baseline: 46 tests passed. Existing work captured in `/tmp/toeic-accounts-baseline/before.patch`.
- Ruling: execute directly after design approval rather than request another workflow approval; preserve current changes on a dedicated branch. No unrelated files will be committed.
- Task 1: PostgreSQL RLS, grants, transaction and rollback tests pass in PGlite; first migration applied successfully to the named Supabase project via SQL Editor. Seven application tables verified with RLS enabled.
- Task 2: Auth/admin policy tests pass; SSR auth, admin UI and API implemented. Public signup disabled on the real project. API keys requested through local env editing, never through chat.
- Task 3: Cloud stores preserve existing grading. Ruling: workspace concurrently gained achievement collections/progression; retain those additions and their separate migration rather than reverting them. Independent progression work is outside this task's review scope.
- Task 4: Dry-run/import tooling and setup guide implemented; import migration applied to cloud. No personal learning data imported yet; admin target must be selected explicitly.
- Review: independent reviewer identified lost login return paths and missing per-page vocabulary guards. Fixed both; redirect unit test RED→GREEN. Added positive/negative test-parent retry coverage. Targeted suite 14/14; full workspace suite 71/71 at this checkpoint.
- Verification caveat: PGlite serializes execution in one instance; it is not a multi-connection contention test. Build in sandbox stalled; outside sandbox compiled, initially failed on concurrently-created progression tests, then a concurrent build held the build lock. Will retry after the other build completes.

- Final verification: 72/72 Node tests, lint and TypeScript pass; production build passes with configured Supabase keys.
- Real Supabase integration smoke passes: login/HttpOnly cookies, admin and learner API boundaries, two concurrent duplicate HTTP saves, per-user RLS and progress, lock/unlock, password reset, logout and return paths. Both temporary accounts and their data were removed in cleanup.
- User explicitly authorized progression migration; applied successfully in SQL Editor. Setup guide includes all three migrations.
- Remaining user setup: create the real initial account using the open Supabase form, designate it as admin, then configure the same environment variables on Vercel and redeploy. No existing SQLite history imported and no deployment performed.
