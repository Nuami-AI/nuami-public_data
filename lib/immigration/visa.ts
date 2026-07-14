export type VisaBreakdownItem = {
  code: string;
  label: string;
  count: number;
};

const FOCUS_VISA_CODES = new Set(["D-2", "D-4"]);

export function normalizeVisaCode(raw: string): string {
  const compact = raw.toUpperCase().replace(/\s/g, "");
  const match = compact.match(/^([A-Z])(\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return raw.trim();
}

export function isFocusVisa(code: string): boolean {
  return FOCUS_VISA_CODES.has(normalizeVisaCode(code));
}

export function matchFocusVisaField(
  status: string
): "d2Students" | "d4Trainees" | null {
  const code = normalizeVisaCode(status);
  if (code === "D-2" || status.includes("유학")) return "d2Students";
  if (code === "D-4" || status.includes("일반연수")) return "d4Trainees";
  return null;
}

export function parseVisaLabel(status: string): { code: string; label: string } {
  const code = normalizeVisaCode(status);
  const paren = status.match(/\(([^)]+)\)/);
  const label = paren?.[1] ?? status;
  return { code, label: `${code} ${label}`.trim() };
}

type RawRow = Record<string, unknown>;

function pickField(row: RawRow, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return undefined;
}

function parseNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(num) ? num : null;
}

export function buildVisaBreakdown(rows: RawRow[], year: number, month: number): VisaBreakdownItem[] {
  const items: VisaBreakdownItem[] = [];

  for (const row of rows) {
    const rowYear = parseNumericValue(pickField(row, ["년", "Year", "year"]));
    const rowMonth = parseNumericValue(pickField(row, ["월", "Month", "month"]));
    const count = parseNumericValue(
      pickField(row, ["체류외국인수", "체류외국인 수", "등록외국인수", "count"])
    );
    const statusRaw = pickField(row, ["체류자격", "Sojourn Status", "visa"]);

    if (rowYear !== year || rowMonth !== month || count === null) continue;
    if (typeof statusRaw !== "string") continue;

    const { code, label } = parseVisaLabel(statusRaw);
    items.push({ code, label, count });
  }

  return items.sort((a, b) => b.count - a.count);
}

export function splitVisaBreakdown(items: VisaBreakdownItem[]) {
  const focus: VisaBreakdownItem[] = [];
  const reference: VisaBreakdownItem[] = [];

  for (const item of items) {
    if (isFocusVisa(item.code)) {
      focus.push(item);
    } else {
      reference.push(item);
    }
  }

  return { focus, reference };
}

export const VISA_LABELS: Record<string, string> = {
  "D-2": "D-2 유학",
  "D-4": "D-4 일반연수",
};
