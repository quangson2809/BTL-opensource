# Kế hoạch hoàn thiện IDAILY

Ngày lập: 06/11/2026 (Asia/Saigon). Trạng thái: đang triển khai theo yêu cầu người dùng; tuyệt đối không tự merge vào `main`.

## 1. Mục tiêu và cơ sở

- Hoàn thiện MVP theo thứ tự: sửa lỗi phân quyền → sửa chức năng hiện có → bổ sung use case còn thiếu → nghiệm thu triển khai.
- Bản mã được đánh giá: `2b9f19f2522d31ad69fcedd40af556d43963668b`, checkout của repository được chọn ở `main` khi thiết lập môi trường. Đây là baseline local; chưa xác nhận lại HEAD mới nhất trên GitHub tại thời điểm lập kế hoạch.
- Nhánh tài liệu hiện tại: `docs/implementation-plan-20261106`, tách từ baseline trên. Chưa tạo các nhánh triển khai tương lai, chưa commit/push/merge/deploy.
- Nguồn đối chiếu: PDF `docs/source/Bao-cao-mon-opensource.pdf`, `PROJECT_PLAN.md`, các quyết định trong `docs/business-change-log.md`, mã nguồn và kết quả kiểm thử local cùng baseline.
- Bằng chứng baseline trong phiên: lint/type-check/build/security-check đạt; 123 contract tests, 329 database assertions, 5 bộ Auth/nghiệp vụ integration và 21 route checks đạt. Đây không phải kết quả CI của các PR tương lai hoặc nghiệm thu production.
- Rà soát bổ sung đã tái hiện lỗi DM sửa/xóa draft sau khi mất `NOTIFICATION_MANAGE`; SQL chạy trong transaction local và đã rollback. Đã tái hiện hàm tìm kiếm làm biến đổi email và mã có dấu chấm/gạch dưới.

## 2. Quy tắc Git bắt buộc

1. Mọi thay đổi nằm trên nhánh `fix/*`, `feature/*`, `test/*`, `chore/*` hoặc `docs/*`; không phát triển hay commit trực tiếp trên `main`.
2. Mỗi nhánh có một mục tiêu và một PR riêng, mặc định base PR là `main`.
3. Theo yêu cầu triển khai liên tục mà không tự merge, các nhánh được xếp chồng theo thứ tự R0–R11: nhánh sau bắt đầu từ commit đã kiểm chứng của nhánh trước. Nhánh đầu dựa trên baseline `origin/main`. Ghi rõ base/commit và phạm vi riêng của từng nhánh trong sổ triển khai; PR phụ thuộc trỏ vào nhánh trước để tránh diff trộn. Chỉ đổi base sang `main` sau khi người dùng merge các PR phụ thuộc.
4. Không tạo trước toàn bộ nhánh ở baseline cũ; tên nhánh trong bảng là tên dự kiến.
5. Dùng checkout hiện có trong môi trường cloud; không tạo Git worktree nếu người dùng chưa yêu cầu.
6. Trước khi đổi nhánh, kiểm tra working tree và giữ nguyên thay đổi của người dùng; không dùng reset/clean để làm sạch ép buộc.
7. CI phải xanh trên đúng SHA cuối của PR. Nếu cập nhật code hoặc tích hợp thay đổi từ `main`, chạy lại các kiểm tra bị ảnh hưởng.
8. Mỗi PR nêu `Business impact: YES/NO`, tiêu chí nghiệm thu, bằng chứng test, migration/config cần áp dụng và phương án khôi phục.
9. Đề xuất bật bảo vệ `main`: bắt buộc PR, review và required CI checks; chặn force-push. Đây là cấu hình repository cần thực hiện khi có quyền phù hợp, chưa được thay đổi trong tác vụ lập kế hoạch.
10. Thay đổi database dùng migration mới theo thứ tự thời gian, không sửa migration đã áp dụng để che lỗi trên môi trường cũ.

Ví dụ tạo nhánh cho một phần việc, khi working tree đã sạch:

```bash
git fetch --no-tags origin main
git switch -c fix/notification-permission-revocation FETCH_HEAD
```

Không chạy `git switch main` để triển khai. Người dùng đã cho phép triển khai tự động theo thứ tự và yêu cầu không tự merge. Cho phép lưu commit trên các nhánh công việc để bảo toàn từng phần; không merge hoặc push lên `main`. Hosted production không được coi là sẵn sàng nếu thiếu credential/cấu hình và bằng chứng thực tế.

## 3. Danh sách nhánh và thứ tự thực hiện

Ước lượng là ngày công thực hiện và kiểm thử cho một lập trình viên đã quen dự án, chưa bao gồm thời gian chờ review, quyết định nghiệp vụ hoặc quyền truy cập môi trường.

| Mã | Ưu tiên | Nhánh dự kiến | Mục tiêu | Phụ thuộc | Ngày công |
| --- | --- | --- | --- | --- | --- |
| R0 | P1 | `docs/requirements-acceptance-baseline` | Đồng bộ phạm vi và ma trận nghiệm thu với code/PDF | Không chặn R1 | 0,5–1 |
| R1 | P1 | `fix/notification-permission-revocation` | Chặn sửa/xóa draft sau khi mất permission | Không | 1–2 |
| R2 | P2 | `fix/search-literal-handling` | Tìm kiếm đúng email, mã và ký tự hợp lệ | Không | 0,5–1 |
| R3 | P2 | `feature/customer-search-filters` | Tìm địa chỉ, lọc giới tính, giữ ownership | R2 | 1–1,5 |
| R4 | P2 | `fix/checkbox-picker-accessibility` | Sửa ARIA và kiểm chứng thao tác bàn phím | Không | 0,5–1 |
| R5 | P2 | `chore/dependency-security-updates` | Xử lý dependency có advisory tương thích với stack | Không | 0,5–1,5 |
| R6 | P2 | `fix/role-editor-contract` | Thống nhất metadata và permission của vai trò | R0 | 1–2 |
| R7 | P1 | `feature/admin-account-creation` | Admin tạo tài khoản DM/UM/SA có trạng thái hợp lệ | R0, R6 | 2–4 |
| R8 | P2 | `feature/report-xlsx-export` | Xuất Excel thật và chọn dữ liệu xuất | R0 | 1,5–3 |
| R9 | P2 | `feature/team-report-comparison` | So sánh nhóm có định nghĩa và scope rõ | R0 | 2–4 |
| R10 | P1 trước release | `test/role-workflow-e2e` | Kiểm chứng các luồng tích hợp theo bốn vai trò | R1–R9 đã hoàn tất hoặc được ghi nhận hoãn rõ | 2–3 |
| R11 | P1 trước release | `chore/production-acceptance` | Nghiệm thu hosted Auth, deployment và vận hành | R10 và quyền truy cập môi trường | 1–3 |

P1 của R7 phản ánh mức quan trọng nghiệp vụ; R1 vẫn là việc triển khai đầu tiên. Có thể xử lý R2/R4/R5 độc lập trong thời gian chờ R0. Không xem danh sách này là phân công chạy nhiều agent hoặc nhiều người.

## 4. Phạm vi và tiêu chí hoàn thành từng PR

### R0 — Chốt baseline nghiệm thu

- Đối chiếu use case với PDF trực tiếp, ghi vị trí cụ thể và quyết định thay đổi đã có; không dựa vào trạng thái audit cũ để kết luận code hiện tại.
- Làm rõ hợp đồng chỉnh sửa role: code vai trò bất biến, metadata custom role có được sửa hay không, quyền của DM/UM/SA và ngoại lệ ADMIN.
- Làm rõ việc Admin tạo tài khoản: trường bắt buộc, vai trò được gán, quản lý trực tiếp, trạng thái ban đầu, phương thức cấp mật khẩu và xử lý lỗi Auth/business provisioning.
- Chốt đơn vị nhóm, cách tính số đại lý/khách hàng/hoạt động và quy tắc loại bỏ đếm trùng; chốt tập dữ liệu/cột xuất Excel.
- Ghi chênh lệch giữa PDF §6.2 về tóm tắt khách hàng cấp dưới và implementation chỉ trả số tổng hợp. Chưa thêm trường định danh khách hàng khi chưa có quyết định.
- Hoàn thành khi mỗi mục có trạng thái `IMPLEMENTED`, `BUG`, `MISSING`, `UNVERIFIED` hoặc `OUT_OF_SCOPE`, kèm acceptance và quyết định còn thiếu. Phần chưa có quyết định không chặn các bản sửa lỗi độc lập.

### R1 — Sửa thu hồi quyền thông báo

- Tạo migration mới phục hồi kiểm tra `NOTIFICATION_MANAGE` và trạng thái phiên hợp lệ tại hai RPC update/delete draft; giữ kiểm tra DM, chủ sở hữu, trạng thái draft, subtree và transaction.
- Kiểm tra cả bốn RPC create/update/delete/send có cùng contract quyền; không chỉ dựa vào Server Action hoặc việc ẩn nút.
- Đồng bộ nút tạo/sửa/xóa/gửi với quyền thực tế; người mất quyền vẫn có thể đọc thông báo nếu thuộc scope nhận.
- Nghiệm thu: DM có quyền thao tác được trên draft của mình; DM mất quyền bị từ chối qua RPC trực tiếp; DM khác không can thiệp; thông báo đã gửi bất biến; non-DM và tài khoản không hoạt động bị từ chối.
- Regression phải chứng minh ca mất quyền thất bại trên baseline cũ và đạt sau bản sửa; chạy migration reset, pgTAP, Auth integration liên quan và browser smoke.

### R2 — Sửa tìm kiếm từ khóa literal

- Tách việc bảo vệ cú pháp PostgREST khỏi việc biến đổi ý nghĩa từ khóa; chọn cách escape/query được hỗ trợ, không đơn giản bỏ bộ lọc an toàn.
- Bao phủ email có dấu chấm, mã có `_`/`-`, tên tiếng Việt, ký tự wildcard/ngoặc/dấu phẩy và input trống.
- Rà các caller dùng chung ở tài khoản, nhân sự, khách hàng, thông báo và danh mục vai trò.
- Nghiệm thu bằng dữ liệu truy vấn thực tế, không chỉ so sánh giá trị chuỗi; count và danh sách dùng cùng điều kiện; phạm vi RLS không mở rộng.

### R3 — Hoàn thiện tìm kiếm/lọc khách hàng

- Bổ sung địa chỉ vào tìm kiếm; thêm giới tính vào query params, UI, count, truy vấn trang và active-filter chips.
- Kết hợp được với nhóm tính cách, tình trạng, loại và phân trang; bỏ một bộ lọc không làm mất các bộ lọc còn lại.
- Nghiệm thu: kết quả/count đúng, không tìm thấy có thông báo phù hợp, thao tác lọc đổi về trang hợp lệ, không lộ khách hàng của tài khoản khác.

### R4 — Accessibility của bộ chọn

- Sửa `aria-invalid` không hợp lệ trên group bằng ngữ nghĩa phù hợp; giữ mô tả bắt buộc và liên kết lỗi với control có thể focus.
- Kiểm tra Tab/Shift+Tab/Space/Enter, tìm kiếm, checkbox đang bị ẩn do lọc, bỏ chọn và phục hồi draft.
- Nghiệm thu trên picker người nhận và picker permission; kiểm tra viewport 375/768/1024/1440 và screen-reader smoke. Lint không còn cảnh báo đã xác định.

### R5 — Dependency security

- Audit lại tại thời điểm làm PR vì advisory có thể thay đổi. Snapshot review hiện có 1 High + 8 Moderate, tất cả thuộc dependency phát triển; không suy diễn thành lỗ hổng production.
- Ưu tiên advisory `zod`; đánh giá chuỗi minimatch/ESLint và compatibility với Next.js 16/TypeScript hiện tại.
- Không dùng `npm audit fix --force`, không tắt xác minh TLS/checksum, không hạ Next chỉ để làm audit xanh.
- Hoàn thành khi advisory được xử lý hoặc từng phần chưa xử lý có lý do và quyết định chấp nhận rủi ro rõ ràng; giữ riêng kết quả audit production/dev. Chạy frozen install, static checks, contract tests và build.

### R6 — Contract của role editor

- Triển khai theo quyết định R0, thay vì suy đoán rằng mọi metadata hoặc mọi role đều có thể chỉnh sửa.
- Giữ mã role bất biến, bảo vệ ADMIN và cơ chế ngăn tự khóa/mất Admin cuối cùng.
- UI, Server Action, RPC và tài liệu phải thống nhất về trường read-only và quyền được sửa. Không quảng bá permission chưa có enforcement tại policy/RPC.
- Nghiệm thu: custom role, role hệ thống và ADMIN có các ca allow/deny rõ; thay mapping atomically; request giả mạo không vượt quyền; permission thay đổi phản ánh trong các request tiếp theo.

### R7 — Admin tạo tài khoản

- Thêm route/form/Server Action theo contract R0; chỉ Admin hợp lệ được gọi, chặn truy cập trực tiếp trái phép.
- Kiểm tra email/điện thoại/mã đại lý trùng, role hợp lệ, manager hợp lệ và trạng thái tài khoản.
- Tạo Auth identity bằng boundary server có credential phù hợp; hồ sơ và role assignments phải nhất quán. Thiết kế idempotency và khôi phục lỗi giữa Auth API với giao dịch database, vì chúng không có chung một transaction.
- Nếu cần dọn Auth identity vừa tạo khi provisioning thất bại, chỉ tác động identity thuộc lần tạo đó; không thêm chức năng xóa tài khoản hiện hữu.
- Không log mật khẩu/key/JWT; phương thức giao mật khẩu hoặc invitation phải được chốt trước khi code. Không hard-code tài khoản demo hay dùng server secret làm quyền quản trị cho request thông thường.
- Nghiệm thu: tạo DM đầu tiên/UM/SA, account active theo contract, gán manager/role đúng; trùng dữ liệu, lỗi một phần, gửi lại và non-Admin đều được kiểm tra.

### R8 — Excel và lựa chọn dữ liệu xuất

- Xuất `.xlsx` thật, tên cột tiếng Việt, kiểu số/ngày phù hợp; chọn kỳ và tập dữ liệu xuất theo contract, độc lập với trang đang hiển thị.
- Dùng cùng logic scope với báo cáo; không chuyển sang service-role để truy vấn vượt RLS.
- Chọn thư viện tương thích và kiểm tra dependency trước khi thêm; ghi rõ giữ CSV hay thay thế CSV để tránh làm mất hành vi cũ ngoài ý muốn.
- Nghiệm thu bằng việc mở file với công cụ bảng tính, kiểm tra tiếng Việt, tên file, số liệu, dữ liệu trống, chuỗi có công thức và tài khoản trái quyền.

### R9 — So sánh nhóm

- Bổ sung scoped aggregate/RPC nếu cần, không tải raw khách hàng cấp dưới về trình duyệt để tự cộng.
- Chốt cách nhóm theo cây DM/UM, xử lý người có nhiều vai trò, nhóm lồng nhau và nhân sự ngoài scope.
- Giữ nguyên báo cáo cá nhân; không tự thêm KPI doanh thu hoặc tỷ lệ chuyển đổi khi chưa có dữ liệu/định nghĩa được duyệt.
- Nghiệm thu: hai nhóm khác nhau, nhóm trống, đồng hạng, ranh giới ngày/tuần/tháng Việt Nam, không đếm trùng và không lộ nhóm ngoài scope.

### R10 — Browser E2E theo vai trò

- Sử dụng tài khoản fixture local, không dùng tài khoản/secret production.
- Bao phủ ADMIN/DM/UM/SA: đăng nhập, pending/locked, quản trị, khách hàng, hoạt động, nhân sự, thông báo, report/export theo phạm vi thật.
- Có negative cases gọi RPC trực tiếp; kiểm tra thu hồi quyền sau khi người dùng đã đăng nhập/mở form.
- Kiểm tra submit lặp, lỗi mạng, draft recovery, xác nhận/hủy, loading/empty/error/retry; keyboard và responsive trên các màn bị thay đổi.
- Screenshot từ trình duyệt thực; các test đọc source bằng regex không thay thế bằng chứng tương tác.
- Hoàn thành khi các ca release-critical đều đạt trên đúng SHA và phần chưa chạy được ghi `NOT_RUN`/`BLOCKED`, không gọi là PASS.

### R11 — Nghiệm thu production

- Kiểm tra khả năng cung cấp cấu hình/credential qua settings an toàn; không yêu cầu người dùng gửi secret trong chat.
- Chuẩn bị runbook migration, backup/restore và rollback application; không coi rollback migration dữ liệu là luôn an toàn. Kiểm chứng restore trước khi công bố có khả năng khôi phục.
- Ghi bằng chứng hosted OTP length=8, expiry=600 và reauthentication/recovery với mailbox hợp lệ; chốt SMTP theo đối tượng dùng thật.
- Giữ ngoại lệ hosted Free về exact 6-lần/30-phút và giới hạn email cho đến khi có giải pháp/decision mới; không hạ acceptance âm thầm.
- Preview smoke, kiểm tra theo vai trò, runtime logs, giám sát lỗi và production smoke trên cùng release SHA/artifact.
- Chỉ đánh dấu production-ready khi có evidence thật. Tác vụ lập kế hoạch này không triển khai migration/deploy hay thử nghiệm lên dữ liệu production.

## 5. Mốc thực hiện

| Mốc | Phần việc | Điều kiện kết thúc |
| --- | --- | --- |
| M1 — Sửa lỗi và chốt contract | R0–R6 | Không còn lỗi quyền đã tái hiện; tìm kiếm đúng; contract rõ; rủi ro dependency có hướng xử lý |
| M2 — Hoàn thiện use case | R7–R9 | Các chức năng được chốt có test allow/deny, schema/API/UI nhất quán |
| M3 — Release candidate | R10 | E2E, static/build và database checks đạt trên đúng SHA |
| M4 — Production acceptance | R11 | Hosted Auth/SMTP, migration, backup/restore và smoke có bằng chứng |

Tổng dự kiến khoảng **14–27 ngày công** cho toàn bộ R0–R11, tương đương **3–6 tuần làm việc của một lập trình viên**, cộng thời gian chờ bên ngoài. Đây là ước lượng lập kế hoạch, không phải cam kết ngày phát hành. Nếu cần ra bản sửa an toàn sớm, có thể tạo release candidate chỉ gồm R1–R6 và ghi R7–R9 là phần chưa hoàn thiện; không gọi release đó là đáp ứng đầy đủ PDF.

## 6. Gate chung cho PR

- Lint, `npm run type-check`, `npm run test:contracts`, `npm run security-check`, `npm run build` theo CI hiện có.
- Audit dependency khi đổi package/lockfile hoặc trước release; phân biệt dependency production và development.
- Khi đổi migration/RLS/RPC: local `supabase db reset`, `supabase test db`, Auth integration liên quan và kiểm chứng deny-path thực tế. Không reset database hosted/production.
- Khi đổi giao diện tương tác: browser check luồng chịu ảnh hưởng, trạng thái lỗi, bàn phím và responsive.
- Báo cáo riêng `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`; chỉ merge khi required checks của PR đạt và không còn lỗi P1 chưa xử lý trong phạm vi release.
- Kiểm tra diff cuối, không commit file generated, `.env`, secret hoặc output fixture. Lưu bằng chứng theo SHA, không chỉ trỏ vào kết quả của baseline cũ.

## 7. Backlog sau MVP, chưa đưa vào triển khai mặc định

- Đổi email có xác minh và đồng bộ Supabase Auth.
- Chuyển quản lý/tái cơ cấu cây nhân sự: cần quyết định về lịch sử và phạm vi dữ liệu.
- Liên kết khách hàng–hoạt động, lịch và nhắc việc chăm sóc: cần contract mới.
- Tóm tắt tên/nhóm tính cách khách hàng cấp dưới: cần hòa giải PDF §6.2 với giới hạn dữ liệu hiện tại trước khi thêm.
- Theo dõi lịch sử thay đổi nghiệp vụ: cần mục tiêu vận hành và quyết định dữ liệu, không tự thêm business audit table.

Xóa tài khoản, xóa role, CRUD định nghĩa permission, sửa/xóa thông báo đã gửi, hợp đồng bảo hiểm, bồi thường, phí, KPI doanh thu và CRM ngoài hệ thống không tự động trở thành requirement của kế hoạch này. Nếu mở rộng, tạo decision và nhánh/PR riêng.
