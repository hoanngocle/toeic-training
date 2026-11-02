# Lesson detail loading

The user approved the audit's three optimizations: cache fixed lesson content, defer unopened tabs while retaining drafts, and fetch history only when needed.

Use the existing Next.js 16 Cache Components configuration. Cache only the public lesson component, keyed by slug, with `cacheLife('max')`; keep the page and API authentication checks outside the cache. JSON and cached content are replaced on deployment. Do not cache personal progress or solutions.

Render each practice tab and each Essential exercise only after first activation. Keep it mounted after activation so switching tabs retains answers and pending submissions. Split heavy tab code using `next/dynamic`. Apply the same deferred rendering to collapsed word examples, keeping their controls and target containers present.

Keep the existing learning GET response as the default for compatibility. Add `view=progress` for progress plus a count without downloading session results, and `view=history` for lightweight session summaries. Load history when its tab opens; invalidate it when a save or manual refresh occurs, without refetching merely because another tab is selected. Every query remains scoped to the authenticated user and lesson.

Alternatives: hardcoding new copies of lesson data adds maintenance without avoiding authentication; caching authenticated responses risks stale permissions. The approved approach reuses existing JSON and isolates static caching from authorization.

Verify initial lesson rendering, the absence of unopened exercise content, progress queries without result bodies, summary-only history, existing tests, lint, and a production build. Report isolated rendering measurements separately from real authenticated navigation latency.
