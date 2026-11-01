This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Vocabulary pronunciation (Edge TTS)

The speaker button calls `GET /api/tts?text=appointment`. The Node server
runs `scripts/tts.py` using `edge-tts` and returns MP3 audio with the
`en-US-JennyNeural` voice. Text is limited to 200 characters. Successful
responses are cached in memory (up to 100 entries) and in the browser for
one day; generation has a 20-second timeout and a four-request concurrency limit.

Install the Python dependency before starting Next.js:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
yarn dev
```

On Windows use `.venv\Scripts\python.exe -m pip install -r requirements.txt`.
Set `TTS_PYTHON` to an absolute Python executable path if using another environment.
The default is the project's `.venv` interpreter; activating it is unnecessary.

Use `<PronounceButton text={word} />` from
`components/vocabulary/pronounce-button.tsx` beside each vocabulary entry.
The home page includes three sample words. The button shows loading/playback
status and lets the learner retry on failure. Starting another word stops the
previous audio.

Deployment requires a Node.js server with Python, the requirements installed,
and outbound access to Microsoft's online speech service. Install the Python
environment on the deployment host (do not copy a local `.venv`). A static export
or a JavaScript-only serverless runtime cannot execute this Python integration.
The Python script is included in Next.js output tracing; configure `TTS_PYTHON`
for standalone deployments where the interpreter is outside the application.

Checks: `node --test tests/tts.test.mjs`, `yarn lint`, `yarn build`.
Library documentation: https://github.com/rany2/edge-tts

## Essential Word collection

The 50 lessons from *600 Essential Words for the TOEIC, Third Edition* are part
of `/tu-vung`, with an **Essential Word** badge. Open `/tu-vung/essential-01`
through `/tu-vung/essential-50`. Existing lessons keep their five study modes.
Book lessons add Words in Context, Word Families, Reading (Parts 5–7), Listening
(Parts 1–4), and Word Review shared across each group of five lessons.

- 600 core-word entries with Vietnamese meanings, supplemental American IPA,
  and one original book example per word with a Vietnamese translation. Use the
  shared **Ví dụ** button on each row; there is no separate definitions panel.
  Family tables, passages, and pictures remain available as book scans.
- All 1,070 words in the 24 ordinary lessons also use the same example button,
  with original TOEIC-style examples and translations alongside their existing IPA.
- 1,940 unique book questions are graded on the server. Wrong-answer retries link
  to a saved attempt, and retrying a failed save is idempotent.
- Word Families is a reference table. It has no invented book exercise or score.
- Listening uses the browser's English synthetic voice, explicitly labeled. The
  source PDF did not contain the book's original recordings. Source transcript
  pages are included alongside OCR text with reviewed corrections.
- Both learning APIs store results in `data/learning.sqlite`. Set
  `LEARNING_DB_PATH` to use a separate database for tests or another deployment.
  This is the existing single-user, local progress model.

The source images are in `public/essential/pages/`. The import is reproducible
from the retained OCR, terms, translations, word details, and transcript corrections.
`data/essential/word-details.json` stores examples checked against each lesson's
vocabulary scan; the IPA and Vietnamese translations are supplemental. Ordinary
lesson examples live in `data/vocabulary/examples.json`.

```bash
python3 scripts/import-essential.py --ocr data/essential/source-ocr
npm test
npm run lint
npm run build
```

To render or recognize a replacement copy of the source PDF, use
`scripts/render-essential.py` (requires `pypdfium2` and Pillow) and
`scripts/ocr-essential.swift` (macOS PDFKit/Vision). PDF page numbers are one-based.
The importer consumes answer-key pages 333–336 and transcript pages 340–373.
The source-page images, not raw OCR, are authoritative for exercise wording.

Known source corrections: Lessons 5–6 context keys print 21–22 for 11–12.
Lesson 8 Listening questions 5–6 are omitted from the printed key; A and D were
checked against the questions and transcript, with a note shown in the lesson.
Lesson 29's last key row and several OCR words were checked against the scans.

### Đăng nhập và tài khoản

Ứng dụng dùng Supabase Auth (email + mật khẩu) và PostgreSQL. Chỉ quản trị viên
cấp tài khoản, khóa/mở khóa và đặt lại mật khẩu tại `/admin/users`. Đăng ký công
khai phải được tắt trong Supabase. Tiến độ, lịch sử và thành tích tách theo từng người.

Xem [hướng dẫn thiết lập Supabase](docs/supabase-setup.md) để chạy migration,
tạo admin đầu tiên, cấu hình `.env.local`/Vercel và nhập dữ liệu SQLite cũ.
Mẫu biến môi trường: [`.env.example`](.env.example). Tài khoản không còn lưu trong env.
