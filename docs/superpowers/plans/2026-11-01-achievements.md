# Achievements Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Add the reference-inspired Achievements page with persistent daily learning streaks.
**Architecture:** Shared daily activity helpers called inside existing SQLite save transactions; aggregate existing sessions and backfill historical dates when reading achievements. Authenticated server page provides serializable data to an interactive calendar.
**Tech Stack:** Next.js 16, React 19, node:sqlite, existing CSS theme.
**Spec:** docs/superpowers/specs/2026-11-01-achievements-design.md

## Constraints and review focus
Preserve existing uncommitted work. No new dependencies. Verify empty databases, midnight in Vietnam, missed days, duplicate retries, mixed exercise/vocabulary history, month/year boundaries and mobile layout.

## Tasks
- [x] Test daily date conversion, current/longest streak, calendar boundaries, persistence, backfill and retry behavior in tests/achievements.test.ts; run and observe failure.
- [x] Implement lib/achievements/activity.ts (daily persistence), summary.ts (pure streak/calendar helpers), store.ts (history reads). Integrate inside both store save transactions; rerun tests.
- [x] Implement authenticated app/(learning)/achievements/page.tsx and components/achievements/achievements.tsx with themed CSS, real milestones, month navigation, empty states and accessible calendar. Add sidebar link.
- [x] Run full test suite, lint, TypeScript and production build. Inspect UI when a browser session is available; review changed files and report any limitations.

Verification: 46/46 tests pass; TypeScript, ESLint, production build and diff whitespace checks pass. Browser checked existing history, month navigation, future-month disabled state, and 390px viewport (document width 390px, no horizontal overflow). Independent code review found no actionable issues.
