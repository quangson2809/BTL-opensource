import { NextResponse } from "next/server";
import { resolveReportRange } from "@/lib/reporting";
import { resolveExportOptions, exportTable, tableToCsv, tableToXlsx } from "@/lib/report-export.mjs";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  let options;
  try { options = resolveExportOptions(url.searchParams); }
  catch { return new NextResponse("Invalid export options", { status: 400 }); }
  const range = resolveReportRange(url.searchParams.get("period") ?? undefined, url.searchParams.get("anchor") ?? undefined);
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") return new NextResponse("Unauthorized", { status: 401 });
  const { data, error } = await supabase.rpc("report_scope", { period_start: range.start, period_end: range.end });
  if (error) return new NextResponse("Report scope denied", { status: 403 });
  try {
    const table = exportTable(data ?? [], range.label, options);
    const body = options.format === "xlsx" ? Uint8Array.from(await tableToXlsx(table)) : tableToCsv(table);
    return new NextResponse(body, { headers: {
      "Content-Type": options.format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="idaily-report-${range.anchor}-${range.period}.${options.format}"`,
      "Cache-Control": "private, no-store",
    } });
  } catch { return new NextResponse("Could not generate report", { status: 500 }); }
}
