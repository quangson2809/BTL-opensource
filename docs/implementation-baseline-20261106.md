# R0 — Baseline triển khai

Business impact: NO — khóa phạm vi thực hiện từ PDF và contract đã tồn tại; không mở rộng quyền dữ liệu.

Baseline GitHub `main` đã fetch: `2b9f19f2522d31ad69fcedd40af556d43963668b`.
Người dùng yêu cầu triển khai tự động, tuần tự, không tự merge vào main. Nhánh sau được xếp chồng trên nhánh trước và mỗi phần có commit riêng. Không có thao tác merge/push vào main.

| Phần | Contract thực hiện | Acceptance |
| --- | --- | --- |
| Thông báo | DM + NOTIFICATION_MANAGE + active password session; chỉ draft tự tạo được sửa/xóa | Quyền bị thu hồi phải chặn RPC trực tiếp, UI nhất quán |
| Tìm kiếm | Từ khóa literal, giữ dấu chấm/gạch dưới; escape cú pháp PostgREST/ILIKE | Email/mã/tên tiếng Việt tìm đúng; payload cú pháp không làm mở scope |
| Khách hàng | PDF chức năng 3.6/3.7, trang vật lý 25: địa chỉ, nhóm tính cách, tình trạng, giới tính | Count/list/filter chips/phân trang nhất quán; ownership không đổi |
| Vai trò | RPC mới nhất cho sửa tên/mô tả custom role, chỉ sửa permission của DM/UM/SA; ADMIN bất biến | UI thể hiện đúng quyền sửa; không xóa role hoặc định nghĩa permission |
| Tạo tài khoản | PDF 2.1.1, trang vật lý 20–21: Admin nhập email/mật khẩu và hồ sơ; account active, role và manager hợp lệ | Auth/business không bỏ lại account active thiếu role; idempotency, deny non-Admin, không xóa account đã tồn tại |
| Excel | PDF 7.6, trang vật lý 29: chọn kỳ và tập dữ liệu xuất trong chức năng export | XLSX có kiểu số/tiếng Việt đúng; scope caller JWT; giữ CSV tương thích |
| So sánh nhóm | PDF 7.5, trang vật lý 29: tổng khách hàng/hoạt động/đại lý trong scope | Đơn vị UM/subtree cần ghi rõ, xử lý nhóm lồng nhau không trùng; không thêm KPI hợp đồng |
| Production | Hosted OTP 8/600, SMTP, smoke và restore có bằng chứng | Thiếu truy cập/cấu hình ghi BLOCKED, không dùng local PASS thay production |

Mật khẩu ban đầu do Admin nhập theo PDF, không lưu localStorage/draft/log. Không thêm cơ chế gửi mật khẩu qua email hoặc đổi requirement sang invitation. Tạo Auth identity là thao tác server đặc quyền sau khi xác minh caller Admin; các thao tác quản trị database vẫn kiểm tra caller JWT. Bù lỗi chỉ được dọn identity mới tạo trong đúng lần yêu cầu, không tạo chức năng xóa tài khoản.

Phạm vi giữ nguyên: không xóa tài khoản/role, không CRUD định nghĩa permission; không sửa/xóa thông báo đã gửi. Tóm tắt tên/DISC khách hàng cấp dưới, đổi email, chuyển quản lý, lịch chăm sóc và audit business là backlog cần quyết định riêng.

Baseline kiểm chứng local trong phiên trước: 123 contracts, 329 database assertions, 5 Auth suites, 21 route checks. Lỗi notification revocation và tìm kiếm đã tái hiện; kết quả baseline không đại diện cho thay đổi mới. CI remote chưa được xác minh trong đợt này.
