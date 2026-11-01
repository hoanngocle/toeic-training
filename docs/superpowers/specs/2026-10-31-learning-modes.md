# Personal vocabulary practice

Implement the user's approved Flash Card, Writing and Test flows for all existing lessons. Use local SQLite for one user without login. Keep vocabulary JSON and stable lesson slug/word IDs; do not change supplied content.

Flash Card: English/Vietnamese sides, click to flip, audio, previous/next, shuffle and starting side. Add explicit Remembered/Needs practice ratings to persist progress.
Writing: choose either translation direction; check answers, show correct answer after a mistake, retry mistakes. Accept any listed Vietnamese meaning, ignore casing/extra spaces and terminal punctuation, retain Vietnamese accents. Parenthetical explanatory notes are optional.
Test: 20 distinct words, balanced translation directions, four unique choices with nonoverlapping meanings, distractors from the same lesson. Grade only on submission, show score and review, retry wrong words. Persist results, answers, duration and timestamps.
Show per-lesson progress and recent saved history, including per-answer review. SQLite lives in data/learning.sqlite, excluded from version control; requires Node 24 and persistent local storage. No accounts or remote synchronization.
