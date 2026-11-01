# Word examples and pronunciation

Goal: remove the separate original-definition region and reuse the existing Example button for every word list. Essential examples come directly from the provided book, with Vietnamese translations and American IPA. Process each collection in lesson order, starting at lesson 1.

- Remove original-definition region (done).
- Fill Essential word-details.json sequentially from Essential01 to50, verifying scans and keeping imports reproducible (done: 600 entries).
- Audit ordinary lessons and fill missing examples with concise original TOEIC-style sentences and translations, preserving existing entries (done: all 1,070 words across 24 lessons have bilingual examples and existing IPA).
- Independent collections may be prepared in parallel under dispatching-parallel-agents; lesson order within each collection is sequential.
- Validate every word has an example pair and IPA; preserve IDs, terms, meanings, progress and exercise content (done: 1,670 entries; original source and exercise content hashes unchanged).
- Regenerate book.json, run content checks/lint/build, verify the shared button and removed region on the running site (done: 22 tests, lint and production build pass; browser checked Essential01/50 and ordinary1/24, including expand/collapse, bilingual text and IPA).

Review: independent integration/content sample review found no actionable issues. All Essential vocabulary pages were visually checked during transcription; final 600-entry details match the generated manifest. No qualifying Next.js feedback candidates in this request.
