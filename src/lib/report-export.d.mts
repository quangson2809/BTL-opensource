export type ExportOptions = { format: "csv" | "xlsx"; scope: "all" | "self" | "team"; columns: string[] };
export const REPORT_COLUMNS: readonly { key: string; label: string }[];
export function resolveExportOptions(params: URLSearchParams): ExportOptions;
export function exportTable(data: unknown, rangeLabel: string, options: ExportOptions): (string | number)[][];
export function tableToCsv(table: (string | number)[][]): string;
export function tableToXlsx(table: (string | number)[][]): Promise<Buffer>;
