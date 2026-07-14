import {
  getPublicApiConfig,
  ODCLOUD_DATASETS,
  type PublicApiConfig,
} from "./config";
import { fetchAllOdcloudRows } from "./client";
import { transformMonthlyRows } from "./transform";
import type { RawRow } from "./ranking";
import {
  normalizeSidoName,
  parseCount,
  parseRegisteredOnlyCount,
  parseYearMonth,
} from "./ranking";

const regionRowsCache = new Map<string, RawRow[]>();
const nationalCountCache = new Map<string, number>();

export type LongTermRegionMode = "combined" | "merged" | "registered";

function regionCacheKey(config: PublicApiConfig): string {
  return [
    config.longTermRegionPath,
    config.regionPath,
    config.residenceRegionPath,
    config.minYear,
  ].join("|");
}

function pickSido(row: RawRow): string {
  return normalizeSidoName(
    String(row["시도"] ?? row["Resion"] ?? row["region"] ?? "")
  );
}

function regionRowKey(row: RawRow): string {
  const period = parseYearMonth(row);
  if (!period) return "";
  const sido = pickSido(row);
  const sigungu = String(row["시군구"] ?? row["district"] ?? "");
  return `${sido}|${sigungu}|${period.year}|${period.month}`;
}

function parseRegisteredCount(row: RawRow): number {
  const value = parseRegisteredOnlyCount(row);
  return value ?? 0;
}

function parseResidenceCount(row: RawRow): number {
  const raw = row["국내거소신고동포수"] ?? row["거소신고자수"] ?? row["거소신고수"];
  const value = Number(String(raw ?? "").replace(/,/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function mergeRegisteredAndResidenceRows(
  registeredRows: RawRow[],
  residenceRows: RawRow[]
): RawRow[] {
  const merged = new Map<string, RawRow>();

  for (const row of registeredRows) {
    const key = regionRowKey(row);
    if (!key || key.startsWith("|")) continue;
    merged.set(key, {
      ...row,
      시도: pickSido(row),
      장기체류외국인수: parseRegisteredCount(row),
    });
  }

  for (const row of residenceRows) {
    const key = regionRowKey(row);
    if (!key || key.startsWith("|")) continue;
    const residence = parseResidenceCount(row);
    if (!residence) continue;

    const existing = merged.get(key);
    if (existing) {
      existing["장기체류외국인수"] =
        Number(existing["장기체류외국인수"] ?? 0) + residence;
    } else {
      merged.set(key, {
        ...row,
        시도: pickSido(row),
        장기체류외국인수: residence,
      });
    }
  }

  return Array.from(merged.values());
}

export function resolveLongTermRegionMode(config: PublicApiConfig): LongTermRegionMode {
  if (config.longTermRegionPath) return "combined";
  if (config.regionPath && config.residenceRegionPath) return "merged";
  return "registered";
}

export function getLongTermRegionSourceMessage(config: PublicApiConfig): string {
  const mode = resolveLongTermRegionMode(config);
  if (mode === "combined") {
    return "법무부 등록/거소 외국인 시군구별 (15125383) · 단기체류 제외";
  }
  if (mode === "merged") {
    return "법무부 등록외국인(15100022) + 거소신고동포 시군구별(15155792) · 단기체류 제외";
  }
  return "법무부 등록외국인 시군구별 (15100022) · 거소 미포함";
}

export function getLongTermRegionMetricLabel(config: PublicApiConfig): string {
  const mode = resolveLongTermRegionMode(config);
  if (mode === "registered") return "등록외국인";
  return "장기체류외국인 (등록+거소)";
}

export function getLongTermRegionMetricNote(config: PublicApiConfig): string | null {
  const mode = resolveLongTermRegionMode(config);
  if (mode !== "registered") return "단기체류외국인 제외";
  return "ODCLOUD_RESIDENCE_REGION_UDDI(15155792) 설정 시 참고 화면과 동일한 장기체류 기준으로 집계됩니다.";
}

export async function loadLongTermRegionRows(
  config: PublicApiConfig,
  options?: { minYear?: number }
): Promise<RawRow[]> {
  const cacheKey = regionCacheKey(config);
  const cached = regionRowsCache.get(cacheKey);
  if (cached) return cached;

  const minYear = options?.minYear ?? config.minYear;
  const mode = resolveLongTermRegionMode(config);

  let rows: RawRow[] = [];

  if (mode === "combined" && config.longTermRegionPath) {
    rows = await fetchAllOdcloudRows<RawRow>(config, config.longTermRegionPath, 1000, {
      minYear,
    });
  } else if (mode === "merged" && config.regionPath && config.residenceRegionPath) {
    const [registeredRows, residenceRows] = await Promise.all([
      fetchAllOdcloudRows<RawRow>(config, config.regionPath, 1000, { minYear }),
      fetchAllOdcloudRows<RawRow>(config, config.residenceRegionPath, 1000, {
        minYear,
      }),
    ]);
    rows = mergeRegisteredAndResidenceRows(registeredRows, residenceRows);
  } else if (config.regionPath) {
    rows = await fetchAllOdcloudRows<RawRow>(config, config.regionPath, 1000, {
      minYear,
    });
  }

  regionRowsCache.set(cacheKey, rows);
  return rows;
}

export async function loadLongTermNationalCount(
  year: number,
  month: number
): Promise<number | null> {
  const cacheKey = `${year}-${month}`;
  const cached = nationalCountCache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const config = getPublicApiConfig();
    const monthlyRaw = await fetchAllOdcloudRows<RawRow>(
      config,
      config.monthlyPath,
      1000,
      { minYear: config.minYear }
    );
    const stats = transformMonthlyRows(monthlyRaw);
    const stat = stats.find((item) => item.year === year && item.month === month);
    const count = stat?.longTermForeigners ?? null;
    if (count !== null) {
      nationalCountCache.set(cacheKey, count);
    }
    return count;
  } catch {
    return null;
  }
}

export function sumRegionalCountsForPeriod(
  rows: RawRow[],
  year: number,
  month: number
): number {
  let total = 0;
  for (const row of rows) {
    const period = parseYearMonth(row);
    if (!period || period.year !== year || period.month !== month) continue;
    total += parseCount(row) ?? 0;
  }
  return total;
}

export function buildPathForDataset(datasetId: string, uddi: string): string {
  const normalized = uddi.startsWith("uddi:") ? uddi : `uddi:${uddi}`;
  return `${datasetId}/v1/${normalized}`;
}

export const LONG_TERM_REGION_DATASETS = {
  registered: ODCLOUD_DATASETS.region,
  residence: "15155792",
  combined: "15125383",
} as const;
