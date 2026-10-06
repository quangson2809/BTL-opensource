import { NextResponse } from "next/server";

import { resolveReportRange } from "@/lib/reporting";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ReportRow = {
  ho_ten: string;
  ma_dai_ly: string;
  is_self: boolean;
  customer_count: number;
  activity_count: number;
  connected_customer_count: number;
};

function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const range = resolveReportRange(
    url.searchParams.get("period") ?? undefined,
    url.searchParams.get("anchor") ?? undefined,
  );

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data, error } = await supabase.rpc("report_scope", {
    period_start: range.start,
    period_end: range.end,
  });

  if (error) {
    return new NextResponse("Report scope denied", { status: 403 });
  }

  const rows = (data ?? []) as ReportRow[];
  const csvRows = [
    [
      "Nhân sự",
      "Mã đại lý",
      "Phạm vi",
      "Khách hàng mới",
      "Hoạt động",
      "Lượt khách kết nối",
      "Khoảng báo cáo",
    ],
    ...rows.map((row) => [
      row.ho_ten,
      row.ma_dai_ly,
      row.is_self ? "Cá nhân" : "Cấp dưới",
      row.customer_count,
      row.activity_count,
      row.connected_customer_count,
      range.label,
    ]),
  ];

  const csv =
    "\uFEFF" +
    csvRows.map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="idaily-report-${range.anchor}-${range.period}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
