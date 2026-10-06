export type ReportPeriod = "day" | "week" | "month";

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

function partsForVietnamDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function validAnchor(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function toAnchor({ year, month, day }: { year: number; month: number; day: number }) {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function vietnamMidnightUtc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day) - VIETNAM_OFFSET_MS);
}

export function resolveReportRange(
  periodInput: string | undefined,
  anchorInput: string | undefined,
) {
  const period: ReportPeriod =
    periodInput === "week" || periodInput === "month" ? periodInput : "day";
  const anchor = validAnchor(anchorInput) ?? partsForVietnamDate(new Date());
  const anchorUtcDate = new Date(Date.UTC(anchor.year, anchor.month - 1, anchor.day));

  let startDate = anchorUtcDate;
  let endDate: Date;

  if (period === "week") {
    const mondayOffset = (anchorUtcDate.getUTCDay() + 6) % 7;
    startDate = new Date(anchorUtcDate);
    startDate.setUTCDate(startDate.getUTCDate() - mondayOffset);
    endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 7);
  } else if (period === "month") {
    startDate = new Date(Date.UTC(anchor.year, anchor.month - 1, 1));
    endDate = new Date(Date.UTC(anchor.year, anchor.month, 1));
  } else {
    endDate = new Date(anchorUtcDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
  }

  const start = vietnamMidnightUtc(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth() + 1,
    startDate.getUTCDate(),
  );
  const end = vietnamMidnightUtc(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth() + 1,
    endDate.getUTCDate(),
  );

  return {
    period,
    anchor: toAnchor(anchor),
    start: start.toISOString(),
    end: end.toISOString(),
    label:
      period === "day"
        ? `Ngày ${toAnchor(anchor)}`
        : period === "week"
          ? `Tuần từ ${toAnchor({
              year: startDate.getUTCFullYear(),
              month: startDate.getUTCMonth() + 1,
              day: startDate.getUTCDate(),
            })}`
          : `Tháng ${String(anchor.month).padStart(2, "0")}/${anchor.year}`,
  };
}
