# Tài khoản riêng với Supabase

Trạng thái: đề xuất để chủ ứng dụng duyệt, chưa triển khai.

## Mục tiêu và phạm vi đã thống nhất

- Chỉ chủ ứng dụng tạo tài khoản cho người được phép học; không đăng ký công khai.
- Một quản trị viên có trang tạo tài khoản, khóa/mở khóa và đặt lại mật khẩu.
- Mỗi người có tiến độ, lịch sử và thành tích riêng, lưu bền vững khi triển khai Vercel.
- Người dùng đã tạo project Supabase `wvcwurjeyeayjautgafn`.
- Giữ giao diện và cách chấm bài hiện có; không thêm thanh toán, đăng nhập mạng xã hội hay hệ thống gửi email.

## Phương án

Đã trao đổi Turso (ít thay đổi SQL SQLite hơn, tự quản lý xác thực) và PostgreSQL. Người dùng chọn tạo project Supabase sau khi trao đổi Supabase Auth + PostgreSQL. Đề xuất dùng cả hai dịch vụ để giảm mã tự quản lý mật khẩu và phiên.

Các lựa chọn triển khai dưới đây là đề xuất của người xây dựng, chưa phải yêu cầu chi tiết do người dùng đặt ra.

## Trải nghiệm

- Đăng nhập bằng email và mật khẩu; thay trường tên đăng nhập hiện tại bằng email.
- Trang `/admin/users` chỉ hiện cho quản trị viên: danh sách có phân trang, tạo người học bằng email/mật khẩu, khóa/mở khóa, đặt mật khẩu mới.
- Không có thao tác nâng quyền quản trị, xóa người dùng hay tự khóa tài khoản quản trị trong giao diện.
- Quản trị viên giao thông tin đăng nhập cho người học ngoài ứng dụng. Mật khẩu không xuất hiện lại trong danh sách hoặc log.
- Tài khoản mới bắt đầu với lịch sử trống. Khóa tài khoản giữ nguyên dữ liệu học.
- Quản trị viên cũng học bình thường và chỉ xem tiến độ của chính mình trong giao diện học.
- Lỗi cấu hình được mô tả trong log máy chủ bằng tên cấu hình còn thiếu, không chứa giá trị bí mật; giao diện hiển thị lỗi phù hợp và không tiết lộ tài khoản có tồn tại hay không.

## Xác thực và phân quyền

- Dùng `@supabase/supabase-js` và `@supabase/ssr`, cookie SSR, cập nhật phiên trong Next.js proxy theo tài liệu phiên bản cài đặt.
- Thay xác thực một tài khoản qua env và cookie HMAC cũ; phiên cũ hết hiệu lực sau chuyển đổi, cần đăng nhập lại.
- Xác minh người dùng trên máy chủ; không tin user ID, role hoặc cookie chưa xác minh do client gửi. Mỗi yêu cầu bảo vệ kiểm tra thêm profile hiện tại để chặn ngay tài khoản bị khóa.
- Bảng `profiles`: `id` tham chiếu Auth user, `role` (`admin` hoặc `learner`), `disabled`, `created_at`. Không dùng user-editable metadata để cấp quyền.
- Tạo profile mặc định `learner` qua trigger khi tạo Auth user; thiếu profile thì từ chối truy cập. Trigger không chấp nhận role do metadata cung cấp.
- Tắt đăng ký mới ở cấu hình Supabase Auth; chỉ bật email/password, không anonymous/OAuth. Không chỉ ẩn nút đăng ký.
- API quản trị kiểm tra admin và nguồn yêu cầu trước khi dùng khóa quản trị. Kiểm tra cả dữ liệu đầu vào và trường hợp email trùng.
- Khóa được thực thi bằng `profiles.disabled`; profile đang khóa bị chặn ở API và RLS dù access token chưa hết hạn. Có thể đồng bộ ban ở Auth, nhưng không phụ thuộc ban để chặn truy cập ứng dụng.
- Đặt lại mật khẩu kèm thu hồi phiên qua cơ chế Auth được hỗ trợ; xác minh hành vi thực tế trước khi hứa thu hồi access token tức thì. Khóa tài khoản vẫn là cách chặn truy cập tức thì.
- Giữ kiểm tra cùng nguồn cho thao tác ghi và dùng giới hạn đăng nhập của Supabase thay bộ đếm theo tiến trình hiện tại.

## Dữ liệu học

- Chuyển `sessions`, `progress`, `essential_sessions`, `activity_days` sang PostgreSQL; mọi khóa nghiệp vụ thêm `user_id`.
- Mã lượt học chỉ duy nhất trong cùng một người dùng; kiểm tra nội dung để gửi lại cùng request không tính điểm hoặc cộng lượt lần nữa.
- Giữ chấm điểm ở máy chủ, đáp án và nội dung giáo trình tiếp tục lấy từ dữ liệu hiện tại. Không cho client tự ghi điểm hoặc tiến độ qua Supabase Data API.
- Người dùng xác thực được đọc dữ liệu của chính mình qua RLS khi profile còn hoạt động. Không có quyền ghi trực tiếp vào bảng tiến độ, lịch sử, profile hoặc sửa role.
- Ghi kết quả qua hàm transaction chỉ máy chủ có quyền gọi bằng khóa bí mật: lưu lượt, cập nhật tiến độ và ngày hoạt động cùng thành công hoặc cùng thất bại. Máy chủ lấy user ID từ phiên đã xác minh; hàm kiểm tra profile hoạt động và xử lý đồng thời bằng khóa phù hợp.
- Lượt ôn sai (`retryOf`) chỉ tham chiếu lượt cùng người và cùng bài. Hai người dùng trùng mã lượt không được nhìn thấy hay ghi đè dữ liệu của nhau.
- Thành tích giữ cách tính theo múi giờ Việt Nam, bao gồm flashcards và những lần trả lời sai như hiện tại.
- Khóa quản trị chỉ nằm ở module server-only, không được đưa vào browser bundle. Các hàm ghi phải thu hồi quyền execute mặc định từ public/anon/authenticated.

## Quản trị viên đầu tiên và dữ liệu cũ

- Chạy migration schema/policies trước. Chủ ứng dụng tạo tài khoản đầu tiên trong Supabase Dashboard, với email được xác nhận thủ công, rồi chạy câu SQL bootstrap cấp role `admin` cho đúng UUID. Không cấp admin cho người đăng nhập đầu tiên tự động.
- Tài khoản quản trị đầu tiên được tạo ngoài ứng dụng; sau đó mọi người học được tạo tại `/admin/users`, dùng Admin API với email đã xác nhận để không cần email SMTP trong phiên bản này.
- Chuẩn bị công cụ nhập SQLite hiện có vào user ID của quản trị viên được chỉ định rõ. Có chế độ kiểm tra trước, transaction, chạy lại không nhân đôi; báo xung đột thay vì ghi đè. Không tự chọn người nhận dữ liệu, không xóa file gốc.
- Triển khai mã được phép tiến hành khi chưa có khóa cloud. Áp dụng migration, nhập dữ liệu và kiểm thử cloud cần quyền truy cập Supabase thực tế; hiện chỉ có URL dashboard, chưa có phiên truy cập được xác minh.

## Cấu hình và triển khai

- `.env.local` và Vercel chứa URL Supabase, publishable key và server secret key theo tài liệu hiện hành; không còn tài khoản/mật khẩu người học trong env.
- Không yêu cầu gửi secret vào chat. Hướng dẫn người dùng điền trực tiếp vào env/Vercel; chỉ kiểm tra sự hiện diện/định dạng khi chẩn đoán.
- Cung cấp migration có phiên bản, hướng dẫn bootstrap, tắt signup, nhập dữ liệu và redeploy đúng môi trường.
- Không thay đổi những phần khác đang có thay đổi chưa commit. Đặc biệt giữ tính năng achievements mới và hành vi trả về `/achievements`.

## Kiểm chứng trước khi hoàn tất

- Kiểm thử đăng nhập/đăng xuất, phiên không hợp lệ, user thường truy cập API admin, tài khoản khóa với phiên còn sống, ngăn tự khóa admin.
- Kiểm thử hai người đọc/ghi cùng mã lượt, retryOf của người khác, gửi lại lượt cũ, nhiều lần lưu đồng thời và rollback khi lỗi.
- Kiểm thử quyền RLS/grants thật trên PostgreSQL: không xem dữ liệu người khác, không tự sửa role/điểm, không gọi hàm ghi bằng publishable key.
- Giữ các bài test chấm điểm và thành tích hiện có, chạy lint/typecheck/build và kiểm tra UI đăng nhập/quản trị.
- Chỉ khẳng định cloud chạy được sau khi migration và luồng đăng nhập/lưu tiến độ đã được kiểm tra trên project thực tế; nếu thiếu quyền truy cập, nêu rõ phần nào chỉ kiểm thử local.

## Tài liệu tham chiếu

- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/reference/javascript/auth-admin-createuser
- https://supabase.com/docs/guides/database/postgres/row-level-security

Đọc lại hướng dẫn Next.js cục bộ trước khi sửa code, theo AGENTS.md.
