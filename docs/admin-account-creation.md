# R7 — Admin tạo tài khoản

Business impact: NO — hoàn thiện use case PDF 2.1.1 (trang vật lý 20–21). Không thêm chức năng xóa tài khoản.

- Admin nhập hồ sơ, email và mật khẩu ban đầu; chọn một hoặc nhiều role. Root ADMIN/DM có thể không có manager; tài khoản khác cần manager DM/UM đang hoạt động. Không hỗ trợ chuyển quản lý trong luồng này.
- Route `/admin/accounts/new` và Server Action yêu cầu Admin từ JWT. Auth identity tạo qua Admin API chỉ sau bước này. RPC business kiểm tra lại Admin active/password và marker do Admin API ghi trong app_metadata; metadata signup thường không đủ điều kiện.
- Request UUID được dùng làm Auth UUID. Cùng request/actor/email trả về account đã tạo mà không thay profile, roles hoặc mật khẩu; request của Admin khác không được nhận diện là retry hợp lệ.
- Profile + assignments commit trong cùng transaction, có advisory lock theo request. Khi Auth API hoặc phản hồi RPC bị mất, thao tác kiểm tra identity/account theo request trước khi kết luận thất bại.
- Nếu provisioning thất bại và chưa có business row, chỉ identity có đúng marker request/actor mới được bù lỗi bằng delete qua Admin API. FK ON DELETE RESTRICT bảo vệ business row nếu có retry đồng thời thành công. Không xóa account hiện hữu.
- Nếu cleanup/network không xác nhận được, UI không báo thành công; giữ request UUID trong URL để thử lại. Operator có thể đối chiếu Auth UUID/app_metadata và business row trong Supabase; không reset mật khẩu hoặc xóa business account để làm sạch một request chưa rõ trạng thái.
- Mật khẩu không vào draft/sessionStorage, URL, log hoặc trang kết quả. Admin chuyển mật khẩu qua kênh an toàn; dùng luồng đổi mật khẩu hiện có sau đó. Chưa triển khai invitation/email gửi mật khẩu.
- Hosted cần server `SUPABASE_SECRET_KEY` và migration mới; local verification không chứng minh hosted đã có cấu hình này.
