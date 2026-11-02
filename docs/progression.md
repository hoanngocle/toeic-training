# Level và cảnh giới

Ứng dụng dùng 200 level và 42 cảnh giới từ cấu hình Nova `nova-core-v2.2`, lưu bản rút gọn độc lập tại `data/progression/nova-level-realms.v1.json`. Tự chuyển cảnh giới khi đạt ngưỡng EXP; không có đột phá bằng vật phẩm hoặc chiến lực. Level tối đa là 200 (540.000 EXP), nhưng EXP học tiếp vẫn được lưu.

## EXP học tập

Version `toeic-learning-v1`: base mỗi câu 16 EXP, hướng Việt → Anh nhân 1,15. Essential dùng base 16. Tổng base của lượt nhân hệ số kết quả: sai hết 0; dưới 50% là 0,5; từ 50% đến dưới 90% là 0,7; từ 90% đến dưới 100% là 1,5; đúng hết là 2. Làm tròn xuống một lần ở cuối. Flashcards không có EXP.

Version `toeic-learning-badges-v2` giữ nguyên EXP gốc, thêm buff huy hiệu: cấp thứ n trong mỗi nhóm cho `n × 0,5%` EXP. Cộng tất cả huy hiệu đã mở, kể cả các cấp thấp trong cùng nhóm; không giới hạn tổng. Với 43 huy hiệu hiện tại, tổng có thể đạt 77%. EXP thưởng thêm = `floor(EXP gốc × tổng buff / 100)`.

Server lấy huy hiệu từ lịch sử đã lưu và thành tích được giữ lại trước lượt nộp bài. Huy hiệu vừa mở có hiệu lực từ lượt tiếp theo. Snapshot lưu `baseExp`, `badgeBonusPercent`, `bonusExp`; gửi lại bài giữ nguyên snapshot. Không cộng bù cho các lượt cũ; backfill giữ nguyên cả v1 và v2 đã được cấp. Chạy `supabase/migrations/202611020002_badge_exp.sql` trước khi triển khai mã server dùng buff.

Chấm bài và tính thưởng ở máy chủ. `learning_exp_ledger` ghi nguồn, snapshot công thức và version riêng theo người dùng. Cùng ID trong vocabulary và Essential là hai nguồn khác nhau; gửi lại cùng bài không cộng trùng. Transaction lưu session, tiến độ, ngày hoạt động và EXP cùng thành công hoặc cùng hoàn tác. Chỉ lần lưu đầu trả thông báo tăng cấp; lịch sử/retry giữ số thưởng cũ.

## Backend thực tế

Khi triển khai, dự án đã chuyển sang Supabase. Vì vậy tính năng này dùng PostgreSQL theo điều khoản dự phòng của plan; không bổ sung một kho EXP SQLite thứ hai. Các SQLite store còn lại phục vụ dữ liệu cũ và kiểm thử tương thích. Nếu cần chuyển dữ liệu SQLite, dùng công cụ nhập tài khoản hiện có trước, rồi backfill EXP cho đúng tài khoản đó.

## Triển khai lần đầu

1. Tạm dừng nhận lượt học và backup PostgreSQL bằng công cụ backup hiện có của dự án. Không xóa hoặc chỉnh sửa lịch sử gốc.
2. Áp dụng theo thứ tự các migration tài khoản/legacy đã có, sau đó `supabase/migrations/202611020001_progression.sql`. Migration mới thay hai save RPC để ghi ledger cùng transaction; triển khai mã máy chủ mới đồng bộ với migration.
3. Với **mỗi tài khoản có lịch sử**, chạy dry-run (đọc tất cả lượt, không giới hạn 50):

   ```sh
   node --env-file=.env.local scripts/backfill-progression.ts <user-uuid>
   ```

   Cần `NEXT_PUBLIC_SUPABASE_URL` và `SUPABASE_SECRET_KEY` ở môi trường, không đưa khóa vào tham số lệnh hoặc chat. Kiểm tra scanned/inserted/existing/expAdded. Bản ghi hỏng sẽ báo nguồn + ID; không bỏ qua bản ghi âm thầm.

4. Sau backup và đối chiếu dry-run, áp dụng:

   ```sh
   node --env-file=.env.local scripts/backfill-progression.ts <user-uuid> --apply
   ```

   Hàm PostgreSQL kiểm tra snapshot lịch sử, khóa profile và ghi toàn bộ trong một transaction. Nếu có lỗi, toàn bộ lượt apply rollback. Chạy lại không nhân đôi. Không sửa kết quả bài cũ; reward của retry lịch sử được lấy từ ledger.
5. Chạy dry-run lần nữa: `inserted: 0`, `expAdded: 0`. Đối chiếu `read_progression` cho tài khoản, kiểm tra đăng nhập/lưu bài/retry và bật nhận lượt học.

Tài khoản mới không có lịch sử bắt đầu ở level 1 ngay. Tài khoản còn thiếu ledger hiển thị trạng thái chờ đồng bộ và từ chối lượt lưu mới bằng lỗi 503 (câu trả lời ở UI vẫn giữ để thử lại). Việc đọc trang không tự backfill. Nếu nhập thêm lịch sử sau này, chạy lại công cụ trước khi tiếp tục học.

Không đổi `toeic-learning-v1` hoặc tính lại các entry đã cấp khi chỉnh balance. Công cụ hiện tại báo conflict nếu snapshot thưởng không khớp thay vì ghi đè. Muốn thay chính sách cần version/migration riêng.

## Kiểm chứng

`node --test tests/progression*.test.ts` kiểm tra công thức, ngưỡng cảnh giới, ledger/rollback/RLS trong PostgreSQL nhúng PGlite, replay và backfill. Thêm `yarn test`, `yarn lint`, `yarn exec tsc --noEmit`, `yarn build` trước khi phát hành. PGlite không thay thế kiểm thử triển khai thật trên Supabase (quyền, giới hạn request, mạng và đồng thời nhiều kết nối).

## Verification — 2026-11-02

72 tests pass; lint, typecheck and production build pass. Independent review completed; malformed-history validation corrected with a RED-to-GREEN regression test. Actual components visually checked with fixture data on desktop/light and mobile/dark. Production migration/backfill and authenticated Supabase end-to-end checks remain unperformed.
