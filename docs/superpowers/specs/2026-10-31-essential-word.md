# Essential Word in the vocabulary library

Approved by the user: reuse `/tu-vung`, add the exact badge `Essential Word`, and show extra tabs only on book lessons. No separate visual application. Preserve all ordinary lessons and existing Flash Card / Writing / Test / History behavior.

Book: user's scanned third edition, 50 lessons in 10 groups, 12 core words per lesson. Preserve original passages, question groups, pictures, word-family tables, answer key and listening transcripts. Source-page images are the authoritative display when OCR would lose layout or wording. Interactive answer sheets must follow the original numbering and use the book answer key. Do not substitute invented exercises. Supplemental Vietnamese meanings and synthesized speech are labeled as additions.

Extra tabs: Words in Context, Word Families, Reading (5–7), Listening (1–4), Word Review (shared by each group of five lessons). Keep all five original practice tabs. Essential routes use `/tu-vung/essential-01` through `essential-50`; existing slugs remain stable. The earlier proposed `/essential-word` can redirect to the common library.

Persist submitted exercise answers, scores and errors separately from word practice. Support retrying incorrect questions. Keep original source pages available, including transcript and answer explanations when only the source key is available; never invent explanations from an unverified key. Listening uses explicitly labeled synthesized speech if no original recording is supplied.

Implementation choices: local JSON book manifest and rendered WebP source pages; OCR import tooling with reproducible page offsets; SQLite exercise sessions using the existing persistent DB location. Source fidelity takes precedence over retyping dense readings. The PDF scan and answer key need import validation. No git repository exists in the supplied directory, so no commits/worktree operations are possible.
