import Link from "next/link";
import { requireBusinessAccount } from "@/lib/business";
import { getCurrentRoleCodes } from "@/lib/role-access";
import { REPORT_COLUMNS } from "@/lib/report-export.mjs";
import { resolveReportRange } from "@/lib/reporting";
import { PageHeader } from "@/components/page-header";
import { SearchableCheckboxPicker } from "@/components/searchable-checkbox-picker";

export const dynamic = "force-dynamic";
export default async function ExportOptionsPage({ searchParams }: { searchParams: Promise<{ period?: string; anchor?: string }> }) {
  const query = await searchParams;
  const range = resolveReportRange(query.period, query.anchor);
  const { supabase, accountId } = await requireBusinessAccount();
  const roles = await getCurrentRoleCodes(supabase, accountId);
  if (!roles) throw new Error("Không thể xác định phạm vi xuất báo cáo.");
  return <main><section className="page-content">
    <PageHeader title="Xuất báo cáo" description="Chọn kỳ, phạm vi và cột dữ liệu riêng cho tệp xuất. Chỉ dữ liệu bạn được phép xem được đưa vào tệp." actions={<Link href="/reports">Quay lại báo cáo</Link>} />
    <form action="/reports/export" method="get" className="stack">
      <input name="custom" type="hidden" value="1" />
      <fieldset className="form-section"><legend>Kỳ và phạm vi dữ liệu</legend><div className="form-grid">
        <label>Kỳ báo cáo<select name="period" defaultValue={range.period}><option value="day">Ngày</option><option value="week">Tuần</option><option value="month">Tháng</option></select></label>
        <label>Ngày tham chiếu<input name="anchor" type="date" defaultValue={range.anchor} required /></label>
        <label>Phạm vi<select name="scope" defaultValue="all"><option value="all">Toàn bộ phạm vi được phép</option><option value="self">Cá nhân</option>{roles.some((role) => ["DM", "UM"].includes(role)) ? <option value="team">Cấp dưới</option> : null}</select></label>
        <label>Định dạng<select name="format" defaultValue="xlsx"><option value="xlsx">Excel (.xlsx)</option><option value="csv">CSV UTF-8 (.csv)</option></select></label>
      </div></fieldset>
      <fieldset className="form-section"><legend>Cột dữ liệu xuất</legend><p className="field-help">Chọn ít nhất một cột.</p>
        <SearchableCheckboxPicker name="columns" options={REPORT_COLUMNS.map((column) => ({ id: column.key, label: column.label }))} selectedIds={REPORT_COLUMNS.map((column) => column.key)} searchLabel="Tìm cột dữ liệu" searchPlaceholder="Tên cột" selectedCountLabel="cột" emptyMessage="Chưa có cột dữ liệu." noResultsMessage="Không tìm thấy cột." required requiredMessage="Chọn ít nhất một cột dữ liệu để xuất." />
      </fieldset>
      <button type="submit">Tải báo cáo</button>
    </form>
  </section></main>;
}
