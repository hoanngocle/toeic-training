# Thiết lập tài khoản Supabase

Project: https://supabase.com/dashboard/project/wvcwurjeyeayjautgafn

## 1. Tạo cấu trúc dữ liệu

Trong SQL Editor của project, chạy lần lượt nội dung đầy đủ của:

1. `supabase/migrations/202611010001_accounts.sql`
2. `supabase/migrations/202611010002_legacy_import.sql`
3. `supabase/migrations/202611020001_progression.sql` (EXP/cấp độ, cần cho phiên bản ứng dụng hiện tại)
4. `supabase/migrations/202611020002_badge_exp.sql` (buff EXP từ huy hiệu, triển khai trước mã máy chủ sử dụng buff)
5. `supabase/migrations/202611020003_ets.sql` (lưu lịch sử ETS 2024 riêng theo tài khoản, không cộng EXP)

Mỗi file là một transaction. Chỉ chạy migration một lần; lỗi không được bỏ qua. Nếu dùng Supabase CLI để quản lý migration, dùng quy trình `supabase db push` thay vì vừa chạy tay vừa push cùng migration.

Migration tạo bảng profiles, lịch sử, tiến độ, ngày học, huy hiệu và nhật ký nhập cũ. RLS chỉ cho người học đọc dữ liệu của chính mình khi còn hoạt động. Người học không tự sửa role/điểm hoặc gọi hàm ghi. Máy chủ chấm điểm rồi gọi RPC bằng secret key.

## 2. Tắt đăng ký công khai

Trong Authentication → Sign In / Providers, tắt **Allow new users to sign up**. Chỉ dùng Email/password; giữ anonymous sign-in và các social provider ở trạng thái tắt. Việc ẩn nút đăng ký trong website không thay thế cấu hình này.

## 3. Tạo quản trị viên đầu tiên

Trong Authentication → Users → Add user → Create new user, tự nhập email và mật khẩu mạnh (ít nhất 12 ký tự), bật xác nhận email tự động nếu có. Sao chép UUID người dùng vừa tạo.

Trong SQL Editor chạy đoạn dưới, thay UUID mẫu bằng UUID của **chính tài khoản quản trị**:

```sql
update public.profiles
set role = 'admin'
where id = 'THAY-BANG-UUID-TAI-KHOAN-CUA-BAN'::uuid
returning id, email, role;
```

Phải trả về đúng một dòng, đúng email của bạn. Không cấp admin cho tài khoản khác. Website không có chức năng thay quyền hoặc tự khóa admin; nếu cần khôi phục quyền dùng Dashboard.

## 4. Kết nối ứng dụng

Trong Project Settings → API Keys, lấy publishable key và secret key. Điền trực tiếp vào `.env.local` tại máy và Environment Variables của Vercel:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://wvcwurjeyeayjautgafn.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=gia-tri-publishable-key
SUPABASE_SECRET_KEY=gia-tri-secret-key
```

Không gửi khóa bí mật vào chat hoặc commit file `.env.local`. `SUPABASE_SECRET_KEY` chỉ dùng phía server. Không thêm tiền tố `NEXT_PUBLIC_` cho khóa này. `.env.example` chỉ chứa tên biến và URL, không chứa khóa.

Các biến `AUTH_USERNAME`, `AUTH_PASSWORD_HASH`, `AUTH_SESSION_SECRET` cũ không còn được dùng. Cookie cũ không đăng nhập được vào hệ thống mới.

Trên Vercel chọn Production và Preview theo môi trường cần chạy, rồi Redeploy. Nên dùng project Supabase riêng nếu muốn dữ liệu Preview tách biệt hoàn toàn với Production. Local: khởi động lại `yarn dev` sau khi sửa env.

## 5. Giữ lại lịch sử SQLite cũ (tùy chọn)

Nhập trước khi tài khoản quản trị bắt đầu học trên Supabase. Tệp nguồn chỉ được mở để đọc và không bị xóa. Công cụ không gộp vào tài khoản đã có dữ liệu, tránh ghi đè tiến độ mới.

Kiểm tra trước (không gửi dữ liệu ra cloud):

```sh
node --env-file=.env.local scripts/import-learning.ts data/learning.sqlite UUID-ADMIN
```

Xem số lượng dòng, xác nhận đúng UUID admin rồi nhập:

```sh
node --env-file=.env.local scripts/import-learning.ts data/learning.sqlite UUID-ADMIN --apply
```

Nhập diễn ra trong một transaction; lỗi sẽ rollback tất cả. Chạy lại cùng snapshot không nhân đôi, kể cả đã học tiếp sau khi nhập. Snapshot khác hoặc tài khoản đích đã có dữ liệu sẽ bị báo xung đột. Công cụ giữ cả ngày hoạt động/huy hiệu cũ và xử lý file thiếu bảng lịch sử không sử dụng.

## 6. Kiểm tra và sử dụng

- Đăng nhập bằng email admin → menu tài khoản → **Quản lý tài khoản** (`/admin/users`).
- Tạo người học bằng email + mật khẩu; giao thông tin riêng cho họ, không cần SMTP gửi email trong phiên bản này.
- Khóa/mở khóa giữ nguyên dữ liệu. Profile và RLS chặn tài khoản khóa ngay ở yêu cầu tiếp theo dù còn access token.
- Đặt lại mật khẩu dùng Supabase Admin API. Supabase thu hồi phiên khi đổi mật khẩu; access token đã phát hành có thể còn hiệu lực đến hạn. Muốn chặn ngay, khóa tài khoản trước.
- Người học không có quyền truy cập trang/API quản trị. Kiểm tra bằng hai tài khoản: học một lượt ở A, đăng nhập B không thấy lịch sử/tiến độ của A.
- Kiểm tra cả flashcard, viết, kiểm tra, bài tập, ôn câu sai và thành tích sau khi reload.

## Kiểm thử cục bộ

```sh
yarn test
yarn lint
yarn exec tsc --noEmit
yarn build
```

Các test PostgreSQL dùng PGlite cục bộ và tạo các role/Auth schema tối thiểu để kiểm tra RLS, grants, transaction và nhập dữ liệu. Chúng không thay thế kiểm thử Auth/cookie trên Supabase thật.

Kiểm thử tích hợp tùy chọn: chạy bản ứng dụng local ở cổng 3125 với cùng project, rồi chạy `node --env-file=.env.local tests/supabase-live.ts`. Script tạo hai tài khoản tạm, kiểm tra đăng nhập, quyền admin, RLS, lưu đồng thời, khóa/mở khóa, đổi mật khẩu và đăng xuất; cuối cùng xóa các tài khoản do chính lần chạy đó tạo.

Tài liệu chính thức: https://supabase.com/docs/guides/auth/server-side/creating-a-client, https://supabase.com/docs/guides/auth/general-configuration, https://supabase.com/docs/guides/auth/sessions.
