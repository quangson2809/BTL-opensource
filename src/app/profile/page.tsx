import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusBadge } from "@/components/status-badge";
import { updateAgencyProfile } from "@/app/profile/actions";
import { requireActiveBusinessAccount } from "@/lib/business";
import { getCurrentRoleCodes } from "@/lib/role-access";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  ADMIN: "Quản trị hệ thống",
  DM: "Trưởng phòng kinh doanh",
  UM: "Trưởng nhóm kinh doanh",
  SA: "Đại lý",
};

const errorMessages: Record<string, string> = {
  missing: "Họ và tên không được để trống.",
  invalid: "Họ và tên chứa ký tự không hợp lệ.",
  save: "Không thể lưu hồ sơ lúc này. Vui lòng thử lại.",
};

type AgencyProfilePageProps = {
  searchParams: Promise<{ error?: string; status?: string }>;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Chưa có dữ liệu";
  return date.toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default async function AgencyProfilePage({
  searchParams,
}: AgencyProfilePageProps) {
  const { supabase, accountId } = await requireActiveBusinessAccount();
  const [profileResult, roleCodes] = await Promise.all([
    supabase
      .from("tai_khoan")
      .select(
        "id,ho_ten,email,so_dien_thoai,ma_dai_ly,manager_id,trang_thai,created_at,updated_at",
      )
      .eq("id", accountId)
      .maybeSingle(),
    getCurrentRoleCodes(supabase, accountId),
  ]);

  if (profileResult.error || !profileResult.data || roleCodes === null) {
    return (
      <main className="workspace-page">
        <section className="page-content">
          <PageHeader
            title="Hồ sơ đại lý"
            description="Thông tin cá nhân và các trường do hệ thống quản lý."
          />
          <ErrorState
            title="Không thể tải hồ sơ"
            description="Dữ liệu hồ sơ hoặc vai trò chưa thể tải. Hãy thử lại."
          />
        </section>
      </main>
    );
  }

  const profile = profileResult.data;
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;
  const roleText =
    roleCodes.length > 0
      ? roleCodes.map((role) => roleLabels[role] ?? role).join(", ")
      : "Chưa được gán vai trò";

  return (
    <main className="workspace-page">
      <section className="page-content">
        <PageHeader
          title="Hồ sơ đại lý"
          description="Xem thông tin tài khoản và cập nhật trường hồ sơ được phép."
        />

        {params.status === "saved" ? (
          <p className="message success" role="status" aria-live="polite">
            Đã cập nhật họ và tên.
          </p>
        ) : null}
        {errorMessage ? (
          <p className="message error" role="alert" aria-live="assertive">
            {errorMessage}
          </p>
        ) : null}

        <div className="agency-profile-grid">
          <section
            aria-labelledby="agency-profile-edit-title"
            className="card agency-profile-panel"
          >
            <h2 id="agency-profile-edit-title">Thông tin cá nhân</h2>
            <p className="agency-profile-note">
              Chỉ họ và tên được chỉnh sửa trong phạm vi hiện tại. Dữ liệu được
              kiểm tra lại ở máy chủ trước khi lưu.
            </p>
            <form action={updateAgencyProfile} className="agency-profile-form">
              <label htmlFor="agency-profile-name">Họ và tên</label>
              <input
                autoComplete="name"
                defaultValue={profile.ho_ten}
                id="agency-profile-name"
                name="ho_ten"
                required
                type="text"
              />
              <PendingSubmitButton pendingLabel="Đang lưu hồ sơ…">
                Lưu thay đổi
              </PendingSubmitButton>
            </form>
          </section>

          <section
            aria-labelledby="agency-profile-system-title"
            className="card agency-profile-panel"
          >
            <h2 id="agency-profile-system-title">Thông tin do hệ thống quản lý</h2>
            <p className="agency-profile-note">
              Các trường này chỉ đọc. Email và số điện thoại chưa được mở cập nhật
              vì cần chính sách xác minh và đồng bộ danh tính tương ứng.
            </p>
            <dl className="agency-profile-details">
              <div className="agency-profile-field">
                <dt>ID tài khoản</dt>
                <dd><code>{profile.id}</code></dd>
              </div>
              <div className="agency-profile-field">
                <dt>Email đăng nhập</dt>
                <dd>{profile.email}</dd>
              </div>
              <div className="agency-profile-field">
                <dt>Số điện thoại</dt>
                <dd>{profile.so_dien_thoai}</dd>
              </div>
              <div className="agency-profile-field">
                <dt>Mã đại lý</dt>
                <dd>{profile.ma_dai_ly}</dd>
              </div>
              <div className="agency-profile-field">
                <dt>Vai trò</dt>
                <dd>{roleText}</dd>
              </div>
              <div className="agency-profile-field">
                <dt>Trạng thái tài khoản</dt>
                <dd><StatusBadge value={profile.trang_thai} /></dd>
              </div>
              <div className="agency-profile-field">
                <dt>Quan hệ quản lý</dt>
                <dd>
                  {profile.manager_id
                    ? "Đã thiết lập người quản lý"
                    : "Chưa thiết lập người quản lý"}
                </dd>
              </div>
              <div className="agency-profile-field">
                <dt>Ngày tạo</dt>
                <dd>{formatDate(profile.created_at)}</dd>
              </div>
              <div className="agency-profile-field">
                <dt>Cập nhật gần nhất</dt>
                <dd>{formatDate(profile.updated_at)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </section>
    </main>
  );
}
