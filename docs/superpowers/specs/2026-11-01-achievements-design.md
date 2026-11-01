# Achievements

Add /achievements and a sidebar link. Use the supplied reference: latest milestone badge, browsable monthly activity calendar, current streak. Match existing theme and support mobile.

Confirmed scope: learning actions (flashcard ratings, submitted writing answers, submitted tests/exercises), including incorrect answers. Navigation and merely opening a page do not qualify. Use Asia/Ho_Chi_Minh dates. Store unique active days in SQLite atomically with successful learning saves; retries never award an additional day or activity. Import dates from existing session history. A streak ending yesterday stays current until today ends; a missed full day resets it. Show longest streak, active days, and milestones based on saved learning sessions (1, 10, 50, 100, 250, 500, 1000).

Approach: reuse existing SQLite stores and authenticated server rendering. Browser-only storage would lose cross-device persistence; recomputing dates only in the UI would not meet daily persistence. No new dependencies or account model changes. Existing app has one shared authenticated learning database.
