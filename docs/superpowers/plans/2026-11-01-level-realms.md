# Level và cảnh giới từ Nova — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa tiến trình học → EXP → level → cảnh giới vào toeic-training, chỉ lấy phần phục vụ tiến độ học.

**Architecture:** Port cấu hình và quy tắc cần thiết từ PHP sang module TypeScript thuần. Máy chủ tính EXP từ kết quả đã chấm, ghi cùng transaction lưu bài; level và cảnh giới được dẫn xuất từ tổng EXP. Phương án đã chốt dùng SQLite hiện có, không kéo runtime Laravel hoặc các hệ thống game sang.

**Tech Stack:** Next.js 16.4.3, React 19.3, TypeScript, Node.js >=24, node:sqlite, node:test; không thêm dependency.

**Spec:** Phần “Thiết kế đã chốt” trong tài liệu này. **Trạng thái: đã được người dùng duyệt ngày 02/11/2026, chưa triển khai.** Phê duyệt bao gồm phạm vi level/cảnh giới, phương án A tự chuyển cảnh giới, công thức EXP rút gọn và backfill lịch sử TOEIC với backup/dry-run trước khi apply.

## 1. Kết quả khảo sát

Nguồn Nova, đường dẫn tính từ `/Users/nyx/company/nova`:

| Nguồn | Nội dung lấy/tham khảo |
| --- | --- |
| `database/data/nova/game-balance-v2.json` | Cấu hình `nova-core-v2.2`: 200 level, 42 cảnh giới, ngưỡng EXP tích lũy, stage |
| `docs/nova/systems/character-levels-and-realms.md` | Tên, thứ tự cảnh giới, nhãn tiểu cảnh giới, ranh giới 116 → 117 |
| `app/Services/Game/Progression/BaseProgressionService.php` | Tổng EXP, lookup level, chống nhận thưởng trùng, transaction |
| `config/learning.php` | EXP cơ sở 16, hệ số hướng dịch và kết quả bài |
| `app/Services/Learning/LearningRuntimeService.php` | Snapshot thưởng; tổng question base × hệ số kết quả × các bonus |

Không dùng `database/data/m_level.csv`: tài liệu Nova đánh dấu là legacy. Không copy toàn bộ service PHP vì service còn gọi realm cap và permanent unlock của game.

Lưu ý khác biệt nguồn: tài liệu mô tả phase `inner_world/cosmic`, nhưng JSON thực tế dùng `cultivation/immortal/cosmic`. Giữ enum từ JSON; nhãn stage dựa vào `stage_scheme` của realm, không chỉ dựa vào `stage_key`. Ví dụ `early` ở cosmic phải hiển thị “Sơ Giai”, không phải “Sơ Kỳ”.

Hiện trạng đích:

- `lib/learning/store.ts`: flashcard, writing, test; chấm ở server, idempotency theo ID + payload, transaction `BEGIN IMMEDIATE`.
- `lib/essential/store.ts`: bài tập sách, reading/listening/review và lượt ôn sai `retryOf`; cùng DB và có transaction.
- `lib/achievements/activity.ts`: đã có mẫu ghi ngày hoạt động cùng transaction lưu bài.
- Chưa có EXP, level hoặc cảnh giới. `progress.streak` là chuỗi đúng theo từ, không phải mastery level hoặc streak thưởng của Nova.
- Auth hiện tại bảo vệ một kho học chung; chưa có `user_id` trong bảng học. Thiết kế Supabase tại `docs/superpowers/specs/2026-11-01-supabase-accounts-design.md` chưa được triển khai trong code đã khảo sát.
- Working tree đang có nhiều thay đổi chưa commit; khi thực hiện phải đọc lại file hiện hành, không ghi đè các tính năng đang làm.

## 2. Thiết kế đã chốt

### Phạm vi và lựa chọn

**Phương án A đã chọn — tự lên cảnh giới theo level:** giữ 200 level, 42 cảnh giới và tiểu cảnh giới của Nova; đủ EXP thì tự chuyển. Phù hợp ứng dụng học, ít state và không cần tài nguyên game.

**Phương án B — giữ nút đột phá:** giữ realm state, cap, overflow và lịch sử chuyển; bỏ vật phẩm/chiến lực, thay điều kiện bằng yêu cầu học. Cần quyết định thêm tiêu chí đột phá; đây là phạm vi lớn hơn và không phải phương án mặc định của plan.

Các task sau triển khai **A**, đã được người dùng duyệt. Không có nghề, chiến đấu, chiến lực, đan dược, linh thạch, kim cương, EVA, gacha, nhiệm vụ, danh hiệu hoặc unlock. Không di chuyển tài khoản hay lịch sử người chơi từ Nova.

### Level, cảnh giới và hiển thị

- `level = max(level có cumulative_exp <= totalExp)`, tối đa 200.
- Realm lấy từ bản ghi level; không lưu level/realm/stage như các counter độc lập.
- Giữ nguyên ngưỡng JSON trong lần đầu, kèm version; không tuyên bố tốc độ lên cấp tương đương Nova vì đã bỏ nhiều nguồn EXP/bonus.
- 0 EXP → level 1 / Phàm Nhân; 281 → level 2 / Luyện Khí — Tầng 1; 5.000 → level 11 / Trúc Cơ — Tầng 1.
- 172.750 → level 100 / Đại La Kim Tiên — Đại Viên Mãn.
- 221.388 → level 116 / Thánh Nhân — Đại Viên Mãn; 224.570 → level 117 / Vũ Trụ Cấp — Sơ Giai.
- 540.000 → level 200 / Siêu Thoát — Cực Hạn. Tiếp tục lưu EXP nhưng hiển thị “Đã đạt cấp tối đa”, không chia cho 0.
- Hiển thị card level, tên cảnh giới, stage, thanh EXP cấp hiện tại ở trang chủ và Thành tích. Sau khi lưu bài thành công, hiển thị `+N EXP`; nếu đổi cấp/cảnh giới, có thông báo ngắn trong kết quả.

### EXP tối giản — đã chốt

Không thể chép nguyên công thức Nova: dữ liệu TOEIC hiện thiếu CEFR, mastery 1–10 và snapshot bonus. Đặt các hệ số này bằng 1; không đưa thêm hệ mastery/SRS vào chỉ để tính EXP.

1. Với writing/test: base từng câu = 16 × hướng dịch (`en-vi`: 1; `vi-en`: 1,15).
2. Với bài tập Essential: base từng câu = 16; không suy đoán hướng dịch/độ khó hoặc tự tăng thưởng nghe.
3. `EXP = floor(tổng base của các câu trong lượt × hệ số kết quả)`.
4. Hệ số theo tỉ lệ đúng: 0 → 0; (0; 0,5) → 0,5; [0,5; 0,9) → 0,7; [0,9; 1) → 1,5; 1 → 2.
5. Dùng khoảng liên tục như trên: không copy các khoảng 0,01–0,49 / 0,50–0,89 của Nova một cách máy móc, vì lượt TOEIC có số câu biến đổi và có thể đạt 49,5% hoặc 99,5%.
6. Flashcard tự đánh dấu nhớ/chưa nhớ: 0 EXP. Đọc trang, mở đáp án, nghe audio: 0 EXP. Chỉ lượt đã chấm và lưu thành công mới nhận.
7. Lượt ôn sai được tính theo những câu thực tế nộp. Lượt học mới hợp lệ vẫn có thưởng; retry cùng request không cộng thêm. Đây chưa phải cơ chế chống người học cố ý tạo nhiều lượt để farm EXP.

Ví dụ: writing en-vi đúng 1 câu → 32 EXP; vi-en đúng → 36 EXP; bài 20 câu en-vi đúng 18 → 480 EXP; đúng cả 20 → 640 EXP; sai tất cả → 0 EXP. Không nhân thêm tỉ lệ đúng lần nữa sau hệ số kết quả.

### Lưu dữ liệu và lịch sử cũ

- Bảng `learning_exp_ledger`: `source_type`, `source_id`, `amount`, `reward_version`, `calculation_json`, `created_at`; khóa chính `(source_type, source_id)`, amount nguyên không âm. `source_type` phân biệt `vocabulary` và `essential`, tránh va chạm ID giữa hai bảng.
- Mỗi lượt kể cả 0 EXP có một entry: phân biệt đã xử lý với chưa backfill. Snapshot chứa số câu, số đúng, tổng base và hệ số đã dùng.
- Ghi ledger trên **cùng connection và transaction** của store hiện tại; không mở transaction lồng nhau. Retry trả kết quả thưởng cũ, không tính lại theo config mới.
- Giữ nguyên request từ client; không nhận `exp`, `level`, `realm` tự khai. Response thêm `reward?: {exp: number; version: string}`; trường optional để đọc lịch sử cũ an toàn.
- Backfill lịch sử TOEIC hiện có bằng công thức rút gọn v1: duyệt toàn bộ hai bảng (không dùng `read()` vốn giới hạn 50 lượt), dùng thời điểm gốc, không sửa điểm/lịch sử. Cần dry-run và backup trước khi apply; không chạy backfill khi mở trang.
- Bản ghi cũ sai schema: báo ID và lý do, dừng apply; không âm thầm bỏ qua hoặc đoán điểm. Chạy lại không nhân đôi. Có marker hoàn tất version trong cùng transaction; nếu version chưa hoàn tất, không bắt đầu nhận thưởng mới bằng config đó.
- Triển khai SQLite chỉ phù hợp hiện trạng kho học chung. Nếu Supabase được làm trước, phải sửa phần persistence của plan theo `user_id` + transaction PostgreSQL/RLS; không triển khai đồng thời hai backend. Core TypeScript và tests công thức vẫn tái sử dụng.

## Global Constraints

- Chỉ level/cảnh giới và EXP tối thiểu để vận hành chúng; không port game economy hoặc hệ học đầy đủ của Nova.
- Node.js >=24; không dependency mới; giữ nguyên cách chấm bài và thành tích hiện có.
- Đọc guide Next.js trong `node_modules/next/dist/docs/` trước khi sửa code. Route Handler guide đã được tham khảo trong lượt lập plan.
- Không thay đổi file dự án Nova; dữ liệu chuyển sang phải độc lập, không import bằng đường dẫn sang repo bên cạnh.
- EXP và lượt học cùng commit/rollback. Không tin điểm thưởng từ client, không dùng localStorage làm nguồn EXP.
- Không áp dụng backfill hoặc thay đổi tài khoản trong lượt chỉ lập kế hoạch này.

## Review Focus

- Hai loại lượt trùng ID vẫn nhận thưởng riêng; cùng source retry không nhân đôi — task 3.
- Lỗi sau khi insert session hoặc ledger phải rollback cả hai — task 3.
- Stage cosmic khác nhãn nội thế giới; level 200 không có cấp tiếp — task 1 và 5.
- Tỉ lệ đúng giữa các mốc thập phân và input không hữu hạn không làm sai EXP — task 2.
- Backfill hơn 50 lượt, chạy lại và record hỏng không làm mất hoặc nhân đôi dữ liệu — task 4.

## 3. Các task triển khai

### Task 1 — Cấu hình và hàm suy ra level/cảnh giới

**Files:** tạo `data/progression/nova-level-realms.v1.json`, `lib/progression/types.ts`, `lib/progression/config.ts`, `lib/progression/summary.ts`, `tests/progression.test.ts`.

**Interfaces:** `getProgression(totalExp: number): ProgressionSummary`; summary gồm `totalExp`, `level`, `realmKey`, `realmName`, `stageName: string | null`, `currentLevelExp`, `expToNextLevel`, `progressPercent`, `isMaxLevel`. `expToNextLevel` là EXP còn thiếu, bằng 0 ở max.

- [ ] Viết test các ngưỡng ở thiết kế, thêm threshold −1, đúng threshold và threshold +1; 0 và EXP lớn hơn 540.000; từ chối số âm, NaN, Infinity và số không phải safe integer.
- [ ] Chạy `node --test tests/progression.test.ts`, xác nhận thất bại do module chưa tồn tại.
- [ ] Trích riêng level fields và realm name/range/stage scheme từ JSON Nova, bỏ toàn bộ requirement đột phá. Ghi provenance/version trong JSON đích. Validate 200 level liên tục, 42 realm phủ đúng 1–200, cumulative tăng và delta khớp exp-to-next.
- [ ] Implement hàm thuần, stage theo scheme; max progress 100%, không có next-level target. Chạy lại test, yêu cầu PASS.

### Task 2 — Công thức EXP thống nhất

**Files:** tạo `lib/progression/reward.ts`, `tests/progression-reward.test.ts`.

**Interfaces:** `calculateVocabularyReward(session: Session): RewardCalculation`, `calculateEssentialReward(session: ExerciseResult): RewardCalculation`; `RewardCalculation = {exp: number; version: string; questionCount: number; correctCount: number; baseTotal: number; scoreMultiplier: number}` trong `types.ts`. Version `toeic-learning-v1`.

- [ ] Viết tests ví dụ 32/36/480/640/0 EXP, flashcard 0, mixed direction, Essential và retry subset. Kiểm tra 49,5% → 0,5; 50% → 0,7; 89,5% → 0,7; 90% → 1,5; 99,5% → 1,5; 100% → 2; reject kết quả mâu thuẫn score/total/results hoặc mảng rỗng.
- [ ] Chạy `node --test tests/progression-reward.test.ts` để xác nhận FAIL, implement công thức đúng spec, rồi chạy lại đạt PASS.
- [ ] Dùng phép tính fixed-point cho hệ số hướng dịch để tránh lỗi floor do floating point; không dùng duration client gửi để tăng EXP.

### Task 3 — Ledger cùng transaction lưu bài

**Files:** tạo `lib/progression/store.ts`, `tests/progression-store.test.ts`; sửa `lib/learning/store.ts`, `lib/essential/store.ts`, `lib/learning/types.ts`, `lib/essential/types.ts`.

**Interfaces:** `initializeProgression(db: DatabaseSync): void`; `recordReward(db: DatabaseSync, sourceType: 'vocabulary' | 'essential', sourceId: string, reward: RewardCalculation, createdAt: string): void`; `readProgression(path: string): ProgressionSummary`. `recordReward` yêu cầu transaction của caller, không tự commit/close DB.

- [ ] Viết integration tests trên SQLite tạm: reopen vẫn còn EXP; retry cùng payload giữ thưởng; payload xung đột không tăng; trùng ID khác source không xung đột; ledger lỗi khiến session/progress/activity rollback; flashcard vẫn giữ hành vi thành tích dù EXP 0.
- [ ] Chạy `node --test tests/progression-store.test.ts`, xác nhận FAIL.
- [ ] Khởi tạo schema cùng store, gắn calculate/record sau chấm và trước COMMIT. Gắn reward vào result được lưu; retry lịch sử cũ lấy reward ledger nếu đã backfill, không cấp lại.
- [ ] `readProgression` tổng hợp ledger rồi gọi hàm task 1; không write/backfill trong hàm đọc. Chạy test mới và `node --test tests/store.test.ts tests/essential.test.ts tests/achievements.test.ts`, yêu cầu PASS.

### Task 4 — Backfill lịch sử hiện có

**Files:** tạo `lib/progression/backfill.ts`, `scripts/backfill-progression.ts`, `tests/progression-backfill.test.ts`; cập nhật `docs/learning-storage.md` với backup/dry-run/apply và sự khác biệt auth hiện tại.

**Interfaces:** `backfillProgression(path: string, options: {dryRun: boolean}): {scanned: number; inserted: number; existing: number; expAdded: number}`. Script mặc định dry-run; chỉ `--apply` mới ghi; đường dẫn DB từ `LEARNING_DB_PATH` hoặc default hiện tại.

- [ ] Viết test hơn 50 record mỗi bảng, flashcard 0, chạy hai lần, record hỏng, ledger đã có với snapshot khác (báo conflict), DB rỗng/thiếu một bảng. Dry-run không thay đổi DB; apply lỗi rollback toàn bộ.
- [ ] Chạy `node --test tests/progression-backfill.test.ts`, xác nhận FAIL; implement bằng module task 2/3, không có bản sao công thức.
- [ ] Chạy lại test đạt PASS. Chuẩn bị quy trình ngừng nhận lượt học → backup SQLite/WAL nhất quán → dry-run → apply → đối chiếu tổng/count → bật ứng dụng. Không tự chạy apply trên dữ liệu thật chỉ để kiểm thử.

### Task 5 — Giao diện level/cảnh giới và thưởng sau bài

**Files:** tạo `components/progression/progression-card.tsx`, `components/progression/progression.css`; sửa `app/(learning)/page.tsx`, `app/(learning)/achievements/page.tsx`, `components/home/learning-home.tsx`, `components/achievements/achievements.tsx`, `components/vocabulary/practice/shared.tsx`, `components/vocabulary/practice/writing.tsx`, `components/vocabulary/practice/test-mode.tsx`, `components/vocabulary/practice/use-record.ts`, `components/vocabulary/essential/section.tsx`.

**Interfaces:** `ProgressionCard({summary}: {summary: ProgressionSummary})`; dùng reward optional của task 3. Server pages đọc summary sau `requireUser()`, truyền props xuống client. Sau POST thành công dùng `router.refresh()` để server summary cập nhật; giữ state bài đang học.

- [ ] Hiển thị card trên trang chủ/Thành tích, giữ bố cục và thống kê cũ; thanh tiến độ có accessible label, dark/light và mobile.
- [ ] Hiển thị thưởng từ response server, không tự tính lại trên browser. Lỗi save chưa hiện thưởng; retry thành công không thêm thông báo thưởng tích lũy lần hai. Lịch sử cũ chưa có reward không hiện `undefined`.
- [ ] Để thông báo tăng cấp chính xác, response lưu bài mới bổ sung `progressionChange?: {before: ProgressionSummary; after: ProgressionSummary}` tính trong cùng transaction; không persist sự kiện UI để phát lại trên retry. Cập nhật type và tests task 3 cho first save/retry; retry chỉ trả reward đã lưu.
- [ ] Kiểm tra trình duyệt các trạng thái 0 EXP, ngay trước/sau đổi realm, max level, save fail/retry và refresh trang; dữ liệu thử ở DB tạm, không thay DB học thật.
- [ ] Chạy `yarn test`, `yarn lint`, `yarn exec tsc --noEmit`, `yarn build`; ghi rõ lỗi có sẵn nếu baseline bị ảnh hưởng bởi thay đổi ngoài phạm vi.

## 4. Điều kiện hoàn tất và thứ tự

Task 1 → 2 → 3 → 4 → 5. Trước khi bắt đầu, đối chiếu xem Supabase đã triển khai chưa; nếu đã có, thay task 3/4 theo backend mới và kiểm thử cách ly người dùng trước khi giao tính năng.

Hoàn tất khi đủ 200 level/42 cảnh giới khớp cấu hình, hai luồng học cùng nhận EXP ở server, retry/rollback đúng, backfill kiểm chứng được, UI hiển thị đúng các mốc và không phụ thuộc game subsystem. Chỉ lập plan trong lượt này; chưa sửa code tính năng, chưa đổi DB, chưa commit các thay đổi đang có.

## Cập nhật triển khai 02/11/2026

- Điều khoản backend được kích hoạt: Supabase đã có trong code, dùng ledger PostgreSQL theo user_id thay cho Task 3/4 SQLite. Chi tiết vận hành tại `docs/progression.md`.
- JSON thực tế dùng `four_phases` cho cả realm cosmic; nhãn stage cosmic chọn bằng `realm_phase` để giữ đúng Sơ Giai → Cực Hạn.
- Công thức, ngưỡng và phạm vi sản phẩm giữ nguyên. Migration và backfill production là bước vận hành riêng sau backup; lượt triển khai code kiểm chứng bằng dữ liệu tạm.

### Implementation verification — 2026-11-02

- Tasks 1/2 complete: config, summary and reward tests RED to GREEN.
- Task 3 complete on Supabase: ledger and RPC adapter; PGlite tests cover RLS, account/source isolation, replay, rollback and locked accounts.
- Task 4 complete: dry-run/apply tool, completion marker and stale snapshot rejection. Independent review identified malformed answer IDs/schema; regression test failed before the fix and now passes.
- Task 5 complete: home/achievements cards, post-save rewards and refresh. Actual components visually checked with fixture data on light desktop and dark mobile.
- Verification: 72 tests pass, lint clean, typecheck and production build pass. Sandboxed build stalled; unrestricted build succeeded.
- Production Supabase migration/backfill and authenticated cloud end-to-end checks have not been performed. PGlite does not prove multi-connection concurrency. See docs/progression.md for rollout.
- Changes retained in current checkout with pre-existing work; no commit/push/merge.
