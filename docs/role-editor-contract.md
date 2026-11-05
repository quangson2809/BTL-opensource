# Contract hiện hành của role editor

Business impact: NO — khớp UI với RPC admin_update_role đã tồn tại tại baseline. Không mở rộng quyền database.

| Vai trò | Mã | Tên/mô tả | Permission |
| --- | --- | --- | --- |
| ADMIN | Bất biến | Bất biến | Bất biến |
| DM / UM / SA | Bất biến | Bất biến | Admin được thay tập quyền atomically |
| Custom role | Bất biến | Admin được sửa | Admin được thay tập quyền atomically |

Chỉ Admin active/password-authenticated được thao tác; RLS/RPC là boundary cuối. Không xóa role, không CRUD định nghĩa permission. ACTIVITY_VIEW_SUBTREE và NOTIFICATION_MANAGE chỉ có hiệu lực ở các policy/RPC kiểm tra chúng. Thu hồi quyền thông báo phải chặn cả create/update/delete/send.

Tài liệu business-change-log BC-005 và audit cũ mô tả quyết định tại thời điểm trước khi các migration 20261025120000/20261025164822 cho sửa mapping DM/UM/SA. Bảng trên mô tả trạng thái code hiện tại; không sửa lại lịch sử quyết định hay tuyên bố đã đồng bộ PDF.
