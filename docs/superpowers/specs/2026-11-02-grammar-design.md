# Ngữ Pháp: converted TOEIC lessons

Approved in chat: retain all theory from the four supplied PDFs and turn complete existing examples into interactive exercises. Four categories: Listening Part 2, Listening Part 3, Reading Part 6, Reading Part 7. Each category contains subject-based lessons, with Theory and Practice views. Render text, lists, tables and examples as native HTML, never embed PDFs or scanned pages. Preserve source page references for conversion auditing. Any essential illustration must be an isolated figure, not a page.

Approaches: full theory plus existing examples (selected); full theory plus newly authored exercises (declined). Incomplete examples remain illustrations, with an explanation of missing context. No invented questions or answer keys. Listening uses clearly labeled synthetic speech where only transcripts exist. Practice supports submission, answers, explanations, retry and the existing authenticated exercise persistence workflow. Reuse existing design styles and grading; link the Home card and sidebar to /ngu-phap.

Implementation choices: structured JSON conversion with source-page coverage checks; server-only solutions and public question projections; no database migration because the current essential exercise store supports arbitrary unit IDs. Keep unrelated working changes intact and work in the existing checkout.

## Continuation: five foundation references

User supplied the remaining five categories: ADJ.pdf, GIỚI TỪ - LIÊN TỪ - MỆNH ĐỀ.pdf, Nouns.pdf, Trật tự từ.pdf, Verbs.pdf. Continue the approved conversion workflow without another design gate. Add native subject-based lessons under Tính từ, Giới từ · Liên từ · Mệnh đề, Danh từ, Trật tự từ, Động từ. Preserve all 39 additional pages and the previous four categories. Existing complete worked transformations, formulas and examples can become inline cloze exercises; do not invent distractors, sentences or answers for incomplete source exercises. Source typos and incomplete questions remain visible in the theory; only unambiguous examples are graded. Category counts must be derived from the catalog.
