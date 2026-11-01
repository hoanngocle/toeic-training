> Cập nhật 02/11/2026: runtime tài khoản hiện dùng Supabase; nội dung SQLite dưới đây mô tả kho dữ liệu cũ. EXP/level/cảnh giới dùng PostgreSQL, xem [hướng dẫn progression](progression.md).

# Personal learning data

Run this app with Node.js 24 or newer. No account or database service is required.
The app creates `data/learning.sqlite` on the machine running Next.js on the first
progress request. The vocabulary catalog and examples remain in JSON.

## What is saved

- Every Flash Card rating (remembered / needs practice).
- Each checked Writing answer, direction, grade and elapsed input time.
- Each submitted Test, all answers, score and elapsed time.
- Per-word review counts, correct/incorrect counts, last review, correct streak
  and remembered/learning status.

A word becomes remembered after an explicit Flash Card rating or three consecutive
correct answers. An incorrect answer or needs-practice rating returns it to learning.
The History tab shows the latest 50 Writing/Test records and all word progress for
the current lesson; older records remain in SQLite. Active unsubmitted exercises
remain while switching tabs but reset on a page reload. Submitted results persist.

The local database is shared by all browsers that connect to this running app.
There is no account system or cloud synchronization. This setup is intended for
personal use on a trusted machine, not a public deployment. A deployment needs a
persistent disk; a temporary/serverless filesystem does not preserve SQLite data.
`LEARNING_DB_PATH` can point to an alternative absolute database path.

## Backup

Stop the app first, then copy `data/learning.sqlite` and any adjacent
`learning.sqlite-wal` / `learning.sqlite-shm` files together to a backup folder.
Restore with the app stopped. Do not delete the database when updating the app.
SQLite files are ignored by Git.

## Checks

- `npm test`: grading aliases, quiz construction across all 24 lessons,
  SQLite persistence, idempotent saves, payload validation and progress changes.
- `npm run lint`
- `npx --no-install tsc --noEmit`

No external model/API is used for grading; Writing matches the supplied CSV's
meanings. Vietnamese accents are significant, while case, repeated spaces and
terminal punctuation are ignored. Listed meanings can include or omit their
parenthetical explanation. Unlisted synonyms may be marked incorrect.
