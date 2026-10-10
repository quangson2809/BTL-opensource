# IDAILY — Business requirement changes / deviations

> Scope: đây là sổ đối chiếu **sự khác biệt giữa requirement hiện được mô tả trong repo và bản demo triển khai**, không phải bản sửa của PDF gốc. Canonical source vẫn là `docs/source/Bao-cao-mon-opensource.pdf`. Nội dung/số trang PDF liên quan hiện **UNVERIFIED** vì chưa trích xuất/đối chiếu trực tiếp được. Không khẳng định bất kỳ dòng nào dưới đây là trích nguyên văn PDF.
>
> **Quy tắc:** mỗi PR có tác động nghiệp vụ phải khai báo rõ `Business impact: YES/NO`, ghi trước/sau, nêu quyền lợi/hành vi bị ảnh hưởng, đối chiếu PDF và dẫn Decision Log + Issue. Chỉ xem deviation là accepted sau khi có quyết định của project owner và review phù hợp. Việc sửa tài liệu gốc là bước riêng, không được đánh dấu đã đồng bộ khi chưa thực hiện.

## BC-001 — Khóa đăng nhập khi sai mật khẩu nhiều lần

| Thuộc tính | Nội dung |
| --- | --- |
| Loại | **BUSINESS/SECURITY REQUIREMENT DEVIATION** |
| Contract hiện được ghi trong repo | 6 lần nhập sai mật khẩu liên tiếp thì khóa tạm tài khoản 30 phút; Password Verification Hook thực hiện tại Supabase Auth boundary |
| Bản demo hosted Free sau PR #15 | **Không còn bảo đảm chính xác 6 lần/30 phút** do Password Verification Attempt Hook không được cung cấp trên Free; thay bằng password policy + provider-managed abuse/rate limits, **không tương đương** per-account 6/30 |
| Ảnh hưởng cho người dùng | Khi gõ sai mật khẩu liên tục, tài khoản có thể **không** tự bị khóa đúng mốc 6 lần và không có countdown 30 phút; vẫn có thể bị provider rate-limit |
| Không thay đổi | Admin khóa/mở khóa thủ công, trạng thái chờ phê duyệt, RLS/ownership/hierarchy và gate khóa tạm nếu cột `khoa_tam_den` có giá trị; local/CI vẫn kiểm tra hook |
| Owner decision | Owner chọn phương án không tốn phí trong hội thoại ngày 2026-10-09, cho phép thay đổi MVP deployment contract |
| Code/PR | PR #15 — docs/runbook/comment, **không đổi runtime**. Hook/schema vẫn có; hosted Free không bật hook |
| Requirement/PDF mapping | Phần **xác thực / giới hạn đăng nhập sai / khóa tạm** — **trang, heading và nội dung PDF: UNVERIFIED** |
| Cần sửa tài liệu nghiệp vụ | Ghi rõ đây là **giới hạn của bản demo MVP chạy Free**, không được ghi `đã hoàn thành 6/30` trong bảng nghiệm thu. Nếu PDF gốc yêu cầu chính xác 6/30, bổ sung phụ lục "Known deviation/MVP demo" hoặc quy trình phê duyệt thay đổi, giữ lại yêu cầu chuẩn cho phiên bản chính thức |
| Trạng thái tài liệu nguồn | **PENDING PDF ALIGNMENT**, không sửa PDF gốc ở PR #15 |
| Acceptance demo | Kiểm thử mật khẩu đúng/sai, pending/locked state, RLS; **không tick PASS cho exact 6/30** |

## BC-002 — Phạm vi gửi email OTP của bản demo miễn phí

| Thuộc tính | Nội dung |
| --- | --- |
| Loại | **OPERATIONAL/DEMO DELIVERY SCOPE**; không thay đổi thuật toán xác thực |
| Contract trước khi làm rõ | Runbook cũ yêu cầu self-hosted Auth + SMTP riêng cho môi trường thật |
| Bản demo hosted Free | Supabase default SMTP chỉ gửi được tới **email thuộc project team đã được pre-authorize**; không triển khai gửi email đến địa chỉ bất kỳ |
| Ảnh hưởng cho người dùng | Đăng ký/đặt lại mật khẩu/reauthentication có thể không gửi được OTP tới email ngoài danh sách. Bản demo phải dùng tài khoản email đã được cho phép |
| Không thay đổi | OTP reauthentication/recovery vẫn là luồng bắt buộc của ứng dụng; email công khai cần custom SMTP |
| Requirement/PDF mapping | Phần **đăng ký, khôi phục/đổi mật khẩu, đối tượng demo** — **trang/heading PDF: UNVERIFIED** |
| Cần sửa tài liệu nghiệp vụ | Tách rõ "demo nội bộ với email được phép" và "triển khai phục vụ người dùng bất kỳ"; không quảng bá tính năng gửi mail đại trà là đã sẵn sàng |
| Trạng thái | **DEMO-ONLY CONSTRAINT; PENDING PDF ALIGNMENT** |
| Acceptance | Chứng minh OTP thật đến và xác minh được với email demo đã pre-authorize; email ngoài team **không** được claim supported |

## BC-003 — OTP 8 chữ số, hết hạn sau 600 giây

| Thuộc tính | Nội dung |
| --- | --- |
| Loại | **EXISTING BUSINESS/SECURITY ACCEPTANCE REQUIREMENT — NOT CHANGED** |
| Contract hiện được ghi trong repo | OTP email **8 chữ số**, expiry **600 giây**; dùng cho reauthentication/recovery |
| Tình trạng hosted Free | **UNVERIFIED**: local/CI PASS không chứng minh hosted Auth đã có cấu hình này. **Chưa có quyết định giảm xuống 6 chữ số hoặc kéo dài 3.600 giây** |
| Ảnh hưởng nếu không đúng | Một bản demo có thể gửi/nhận OTP thành công nhưng vẫn sai độ dài/thời hạn theo yêu cầu đã ghi |
| Requirement/PDF mapping | Phần **OTP email / đổi, đặt lại mật khẩu** — **trang, heading PDF: UNVERIFIED** |
| Cần sửa tài liệu nghiệp vụ | **Chưa sửa requirement 8/600.** Trước acceptance phải ghi lại hosted Auth settings thực tế. Nếu không cấu hình được, mở quyết định thay đổi riêng, ghi các giá trị thực tế/ảnh hưởng/owner approval, cập nhật tài liệu và re-review. Không tự coi đây là ngoại lệ được chấp thuận |
| Acceptance hiện tại | **PENDING**: verify settings 8/600 trên project `kulaguukpngkzpwforok`, evidence ngày kiểm tra, test reauthentication và recovery OTP thật |
| Nơi ghi evidence | Issue #13, theo `docs/mvp-deployment.md`; tuyệt đối không lưu mã OTP/password/JWT |

## Hướng dẫn cập nhật tài liệu gốc

Người sở hữu tài liệu sau khi mở `docs/source/Bao-cao-mon-opensource.pdf` cần:

1. Tìm **đúng số trang + heading/đoạn** quy định (a) khóa tài khoản khi sai mật khẩu, (b) luồng đăng ký/OTP email, (c) triển khai/phạm vi sử dụng. Điền reference vào ba mục BC trên; nếu PDF không nêu chi tiết, ghi `NOT SPECIFIED IN PDF`, không tự quy kết.
2. **Không âm thầm thay thế yêu cầu chính thức** bằng giới hạn hạ tầng miễn phí. Nếu chỉ phục vụ chấm đồ án/demo, cập nhật **phụ lục ngoại lệ MVP** ghi rõ chức năng chưa bảo đảm, mức độ ảnh hưởng và lộ trình nâng cấp.
3. Với BC-003, giữ nguyên 8/600 trừ khi cấu hình hosted thực tế chứng minh không thể đáp ứng và **project owner phê duyệt thay đổi mới**. Mọi deviation mới phải có PR/review và mốc nghiệm thu được cập nhật.
4. Khi tài liệu đã được sửa, ghi file/revision/ngày, section/page được cập nhật và link PR/Issue tại đây. Chỉ lúc đó mới đổi trạng thái `PENDING PDF ALIGNMENT` thành `ALIGNED`.

## Audit trail

| Thời điểm | Sự kiện | Business impact | Tài liệu nguồn |
| --- | --- | --- | --- |
| 2026-10-09 | PR #14 ACL production security hotfix | **NO** — thay đổi quyền thực thi DB, không đổi use case/requirement | Không cần sửa business PDF; ghi security implementation review |
| 2026-10-09 | PR #15 hosted Free Auth demo contract | **YES** — BC-001 khác biệt 6/30; BC-002 giới hạn người nhận email demo; BC-003 yêu cầu OTP hiện hữu cần verify, **chưa đổi** | **PENDING PDF ALIGNMENT** |
