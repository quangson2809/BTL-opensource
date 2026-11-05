# R5 — Dependency security

Business impact: NO; chỉ thay dependency phát triển, giữ Next.js 16.4.2/React 19 và runtime contract.

- `npm audit fix` không force đã cập nhật zod lên 4.6.7 và typescript-eslint lên 8.72.1.
- Advisory minimatch GHSA-g3hv-75wg-m249 còn ảnh hưởng parser vì upstream giữ range 10.x. Override chỉ áp dụng cho `@typescript-eslint/typescript-estree → minimatch`, pin bản vá 11.0.1; không đổi minimatch 3.x của các plugin khác.
- API parser sử dụng là `minimatch(filePath, pattern, {dot: true})`; 11.0.1 vẫn cung cấp API này và hỗ trợ Node 20/24 của dự án. Kiểm tra projectService thật xác minh file được allow có program và file ngoài allow bị từ chối.
- Frozen install `npm ci`, lint, type-check, contracts, secret boundary và production build đã qua. Full `npm audit --json` sau thay đổi: 0 vulnerabilities (cả development và production) tại thời điểm kiểm tra.
- Bỏ override khi upstream dùng bản đã vá; vẫn audit lại trong PR/release tương lai vì advisory có thể thay đổi.

Kết quả này thay thế snapshot dependency cũ ở tài liệu acceptance; không đồng nghĩa đã nghiệm thu accessibility hoặc hosted production.
