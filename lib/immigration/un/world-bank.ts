import { toKoreanCountryName } from "./country-names";
import type { MonthlyTrendPoint, RankingItem } from "../types";

const WORLD_BANK_BASE = "https://api.worldbank.org/v2";
const MIGRANT_STOCK_INDICATOR = "SM.POP.TOTL";
const TREND_YEARS = [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024] as const;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type WorldBankCountry = {
  id: string;
  iso2Code?: string;
  name: string;
};

type WorldBankIndicatorRow = {
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number | null;
};

export type UnMigrantStockResult = {
  year: number;
  totalCount: number;
  ranking: RankingItem[];
  topCountries: RankingItem[];
  yearlyTrend: MonthlyTrendPoint[];
  availableYears: number[];
  sourceMessage: string;
};

let cachedRows: WorldBankIndicatorRow[] | null = null;
let cachedAt = 0;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`World Bank API HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function fetchCountryIds(): Promise<string[]> {
  const url = `${WORLD_BANK_BASE}/country?incomeLevel=HIC;LIC;LMC;UMC&format=json&per_page=300`;
  const json = await fetchJson<[unknown, WorldBankCountry[]]>(url);
  return json[1].map((country) => country.id);
}

async function fetchMigrantStockRows(
  countryIds: string[],
  years: number[]
): Promise<WorldBankIndicatorRow[]> {
  const dateRange = `${Math.min(...years)}:${Math.max(...years)}`;
  const chunkSize = 40;
  const rows: WorldBankIndicatorRow[] = [];

  for (let i = 0; i < countryIds.length; i += chunkSize) {
    const chunk = countryIds.slice(i, i + chunkSize).join(";");
    const url = `${WORLD_BANK_BASE}/country/${chunk}/indicator/${MIGRANT_STOCK_INDICATOR}?format=json&date=${dateRange}&per_page=2000`;
    const json = await fetchJson<[unknown, WorldBankIndicatorRow[]]>(url);
    rows.push(...json[1].filter((row) => row.value !== null));
  }

  return rows;
}

async function getMigrantStockRows(): Promise<WorldBankIndicatorRow[]> {
  const now = Date.now();
  if (cachedRows && now - cachedAt < CACHE_TTL_MS) {
    return cachedRows;
  }

  const countryIds = await fetchCountryIds();
  cachedRows = await fetchMigrantStockRows(countryIds, [...TREND_YEARS]);
  cachedAt = now;
  return cachedRows;
}

function buildRankingForYear(
  rows: WorldBankIndicatorRow[],
  year: number
): RankingItem[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    if (Number(row.date) !== year || row.value === null) continue;
    const label = toKoreanCountryName(row.country.value);
    totals.set(label, row.value);
  }

  return Array.from(totals.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function buildYearlyTrend(
  rows: WorldBankIndicatorRow[],
  countries: string[],
  years: number[]
): MonthlyTrendPoint[] {
  const byYear = new Map<number, Record<string, number>>();

  for (const row of rows) {
    const year = Number(row.date);
    if (!years.includes(year) || row.value === null) continue;

    const label = toKoreanCountryName(row.country.value);
    if (!countries.includes(label)) continue;

    const bucket = byYear.get(year) ?? {};
    bucket[label] = row.value;
    byYear.set(year, bucket);
  }

  return years
    .filter((year) => byYear.has(year))
    .map((year) => ({
      month: year,
      label: `${year}년`,
      ...byYear.get(year)!,
    }));
}

async function loadUnMigrantStockInternal(year: number): Promise<UnMigrantStockResult> {
  const rows = await getMigrantStockRows();

  const availableYears = TREND_YEARS.filter((candidate) =>
    rows.some((row) => Number(row.date) === candidate && row.value !== null)
  );

  const targetYear = availableYears.includes(year as (typeof TREND_YEARS)[number])
    ? year
    : availableYears[availableYears.length - 1];

  const ranking = buildRankingForYear(rows, targetYear);
  if (ranking.length === 0) {
    throw new Error(`${targetYear}년 국제이민자 통계를 찾지 못했습니다.`);
  }

  const topCountries = ranking.slice(0, 5).map((item) => item.name);
  const yearlyTrend = buildYearlyTrend(rows, topCountries, [...availableYears]);
  const totalCount = ranking.reduce((sum, item) => sum + item.count, 0);

  return {
    year: targetYear,
    totalCount,
    ranking,
    topCountries: ranking.slice(0, 15),
    yearlyTrend,
    availableYears: [...availableYears],
    sourceMessage:
      "UN DESA International Migrant Stock (World Bank Open Data, SM.POP.TOTL)",
  };
}

export async function loadUnMigrantStock(year: number): Promise<UnMigrantStockResult> {
  return loadUnMigrantStockInternal(year);
}
