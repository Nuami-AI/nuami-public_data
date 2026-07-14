const KOSIS_ORG_ID = "101";
const KOSIS_TABLE_ID = "DT_1B04005N";
const KOSIS_BASE = "https://kosis.kr/openapi/Param/statisticsParameterData.do";
const populationCache = new Map<string, ResidentPopulationPoint[]>();

type KosisRow = {
  C1_NM?: string;
  C1?: string;
  ITM_NM?: string;
  PRD_SE?: string;
  PRD_DE?: string;
  DT?: string;
};

type KosisError = {
  err?: string;
  errMsg?: string;
};

export type ResidentPopulationPoint = {
  year: number;
  month: number | null;
  periodKey: string;
  regionCode: string;
  regionName: string;
  sidoName: string | null;
  level: "national" | "sido" | "sigungu";
  total: number;
};

function getKosisApiKey(): string | null {
  const key = process.env.KOSIS_API_KEY?.trim();
  return key || null;
}

export function isKosisApiKeyConfigured(): boolean {
  return Boolean(getKosisApiKey());
}

function parsePeriod(
  prdSe: string,
  prdDe: string
): { year: number; month: number | null; periodKey: string } {
  if (prdSe === "Y" || prdSe === "A") {
    const year = Number(prdDe);
    return { year, month: null, periodKey: String(year) };
  }

  const year = Number(prdDe.slice(0, 4));
  const month = Number(prdDe.slice(4, 6));
  return { year, month, periodKey: `${year}-${String(month).padStart(2, "0")}` };
}

function classifyRegion(
  code: string,
  name: string,
  currentSido: string | null
): {
  level: ResidentPopulationPoint["level"];
  sidoName: string | null;
  nextSido: string | null;
} {
  if (code === "00" || name === "전국") {
    return { level: "national", sidoName: null, nextSido: currentSido };
  }
  if (code.length === 2) {
    return { level: "sido", sidoName: name, nextSido: name };
  }
  if (code.length === 5) {
    return { level: "sigungu", sidoName: currentSido, nextSido: currentSido };
  }
  return { level: "sigungu", sidoName: currentSido, nextSido: currentSido };
}

function rowsToPoints(rows: KosisRow[], fallbackPrdSe: "M" | "Y"): ResidentPopulationPoint[] {
  const points: ResidentPopulationPoint[] = [];
  let currentSido: string | null = null;

  for (const row of rows) {
    if (row.ITM_NM !== "총인구수" && row.ITM_NM !== "총인구") continue;

    const code = String(row.C1 ?? "");
    const name = String(row.C1_NM ?? "");
    const prdDe = String(row.PRD_DE ?? "");
    const prdSeValue = String(row.PRD_SE ?? fallbackPrdSe);
    const total = Number(String(row.DT ?? "").replace(/,/g, ""));
    if (!code || !name || !Number.isFinite(total)) continue;

    const period = parsePeriod(prdSeValue, prdDe);
    const classified = classifyRegion(code, name, currentSido);
    currentSido = classified.nextSido;

    if (code.length > 5) continue;

    points.push({
      year: period.year,
      month: period.month,
      periodKey: period.periodKey,
      regionCode: code,
      regionName: name,
      sidoName: classified.sidoName,
      level: classified.level,
      total,
    });
  }

  return points;
}

async function fetchKosisRows(params: Record<string, string>): Promise<KosisRow[]> {
  const apiKey = getKosisApiKey();
  if (!apiKey) return [];

  const search = new URLSearchParams({
    method: "getList",
    apiKey,
    orgId: KOSIS_ORG_ID,
    tblId: KOSIS_TABLE_ID,
    objL2: "0",
    itmId: "T2",
    format: "json",
    jsonVD: "Y",
    loadGubun: "2",
    ...params,
  });

  const response = await fetch(`${KOSIS_BASE}?${search.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(`[KOSIS] HTTP ${response.status}`);
    return [];
  }

  const json = (await response.json()) as KosisRow[] | KosisError;
  if (!Array.isArray(json)) {
    if (json.err || json.errMsg) {
      console.error(`[KOSIS] ${json.err ?? ""} ${json.errMsg ?? ""}`.trim());
    }
    return [];
  }
  return json;
}

function monthRange(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): Array<{ year: number; month: number; prdDe: string }> {
  const months: Array<{ year: number; month: number; prdDe: string }> = [];
  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({
      year,
      month,
      prdDe: `${year}${String(month).padStart(2, "0")}`,
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
}

async function loadNationalMonthlyPoints(
  startPrdDe: string,
  endPrdDe: string
): Promise<ResidentPopulationPoint[]> {
  const rows = await fetchKosisRows({
    objL1: "00",
    prdSe: "M",
    startPrdDe,
    endPrdDe,
  });
  return rowsToPoints(rows, "M").filter((point) => point.level === "national");
}

async function loadRegionalMonthlyPoints(prdDe: string): Promise<ResidentPopulationPoint[]> {
  const cacheKey = `regional-M-${prdDe}`;
  const cached = populationCache.get(cacheKey);
  if (cached) return cached;

  const rows = await fetchKosisRows({
    objL1: "ALL",
    prdSe: "M",
    startPrdDe: prdDe,
    endPrdDe: prdDe,
  });
  const points = rowsToPoints(rows, "M").filter(
    (point) => point.level === "sido" || point.level === "sigungu"
  );
  populationCache.set(cacheKey, points);
  return points;
}

async function loadResidentPopulationMonthlyUncached(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): Promise<ResidentPopulationPoint[]> {
  const startPrdDe = `${startYear}${String(startMonth).padStart(2, "0")}`;
  const endPrdDe = `${endYear}${String(endMonth).padStart(2, "0")}`;
  const months = monthRange(startYear, startMonth, endYear, endMonth);

  const [nationalPoints, ...regionalBatches] = await Promise.all([
    loadNationalMonthlyPoints(startPrdDe, endPrdDe),
    ...months.map((item) => loadRegionalMonthlyPoints(item.prdDe)),
  ]);

  return [...nationalPoints, ...regionalBatches.flat()];
}

async function loadResidentPopulationYearlyUncached(
  startYear: number,
  endYear: number
): Promise<ResidentPopulationPoint[]> {
  const rows = await fetchKosisRows({
    objL1: "00",
    prdSe: "Y",
    startPrdDe: String(startYear),
    endPrdDe: String(endYear),
  });
  return rowsToPoints(rows, "Y").filter((point) => point.level === "national");
}

export async function loadResidentPopulationMonthly(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): Promise<ResidentPopulationPoint[]> {
  const startPrdDe = `${startYear}${String(startMonth).padStart(2, "0")}`;
  const endPrdDe = `${endYear}${String(endMonth).padStart(2, "0")}`;
  const cacheKey = `M-${startPrdDe}-${endPrdDe}`;
  const cached = populationCache.get(cacheKey);
  if (cached) return cached;

  const result = await loadResidentPopulationMonthlyUncached(
    startYear,
    startMonth,
    endYear,
    endMonth
  );
  populationCache.set(cacheKey, result);
  return result;
}

export async function loadResidentPopulationYearly(
  startYear: number,
  endYear: number
): Promise<ResidentPopulationPoint[]> {
  const cacheKey = `Y-${startYear}-${endYear}`;
  const cached = populationCache.get(cacheKey);
  if (cached) return cached;

  const result = await loadResidentPopulationYearlyUncached(startYear, endYear);
  populationCache.set(cacheKey, result);
  return result;
}

export function findResidentPopulation(
  points: ResidentPopulationPoint[],
  options: {
    periodKey: string;
    regionName?: string;
    sidoName?: string;
    level?: ResidentPopulationPoint["level"];
  }
): ResidentPopulationPoint | null {
  const normalizedRegion = options.regionName?.replace(/\s/g, "");
  const normalizedSido = options.sidoName?.replace(/\s/g, "");

  return (
    points.find((point) => {
      if (point.periodKey !== options.periodKey) return false;
      if (options.level && point.level !== options.level) return false;
      if (normalizedRegion && point.regionName.replace(/\s/g, "") !== normalizedRegion) {
        return false;
      }
      if (
        options.level === "sigungu" &&
        normalizedSido &&
        point.sidoName?.replace(/\s/g, "") !== normalizedSido
      ) {
        return false;
      }
      return true;
    }) ?? null
  );
}

export function getKosisSourceMessage(): string {
  if (!getKosisApiKey()) {
    return "KOSIS 주민등록인구: KOSIS_API_KEY 미설정 (통계청 KOSIS Open API 인증키 필요)";
  }
  return "통계청 KOSIS · 행정구역별 주민등록인구(DT_1B04005N)";
}
