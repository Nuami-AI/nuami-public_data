import type {
  RankingItem,
  RegionSearchMatch,
  RegionSearchResponse,
  SidoNationalityDistrictRow,
  SidoNationalityOverviewResponse,
  StudentVisaRegionContext,
} from "../types";
import {
  getNearbyUniversitiesInSido,
  getUniversitiesInRegion,
  getUniversitySourceMessage,
} from "../universities/registry";
import { loadYearbookNationalityRegion } from "./nationality-region";
import { loadYearbookVisaRegion } from "./visa-region";

type RegionAggregate = {
  sido: string;
  sigungu: string;
  totalCount: number;
  visas: Map<string, number>;
  nationalities: Map<string, number>;
};

type RegionSearchCache = {
  dataYear: number;
  editionYear: number;
  sourceMessage: string;
  regions: RegionAggregate[];
  byKey: Map<string, RegionAggregate>;
};

let cache: RegionSearchCache | null = null;

function regionKey(sido: string, sigungu: string): string {
  return `${sido}|${sigungu}`;
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFC").replace(/\s/g, "").toLowerCase();
}

function toRanking(map: Map<string, number>, limit?: number): RankingItem[] {
  const sorted = Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  return limit ? sorted.slice(0, limit) : sorted;
}

function findVisaCount(visas: Map<string, number>, patterns: RegExp[]): number {
  let total = 0;
  for (const [label, count] of Array.from(visas.entries())) {
    if (patterns.some((pattern) => pattern.test(label))) {
      total += count;
    }
  }
  return total;
}

function buildStudentContext(region: RegionAggregate): StudentVisaRegionContext {
  const d2Count = findVisaCount(region.visas, [/D-2/i, /유학/]);
  const d4Count = findVisaCount(region.visas, [/D-4/i, /일반연수/]);
  const universitiesInRegion = getUniversitiesInRegion(region.sido, region.sigungu);
  const hasStudentVisa = d2Count > 0 || d4Count > 0;
  const nearbyUniversities =
    hasStudentVisa || universitiesInRegion.length === 0
      ? getNearbyUniversitiesInSido(region.sido, region.sigungu, 8)
      : [];

  return {
    d2Count,
    d4Count,
    universitiesInRegion,
    nearbyUniversities,
    universitySourceMessage: getUniversitySourceMessage(),
  };
}

function toMatch(region: RegionAggregate): RegionSearchMatch {
  const visaRanking = toRanking(region.visas);
  const nationalityRanking = toRanking(region.nationalities);
  const totalFromVisa = visaRanking.reduce((sum, item) => sum + item.count, 0);
  const totalFromNationality = nationalityRanking.reduce(
    (sum, item) => sum + item.count,
    0
  );
  const studentContext = buildStudentContext(region);

  return {
    sido: region.sido,
    sigungu: region.sigungu,
    label: `${region.sido} ${region.sigungu}`,
    totalCount: region.totalCount || totalFromVisa || totalFromNationality,
    visaRanking,
    nationalityRanking,
    studentContext:
      studentContext.d2Count > 0 ||
      studentContext.d4Count > 0 ||
      studentContext.universitiesInRegion.length > 0
        ? studentContext
        : undefined,
  };
}

function loadRegionSearchCache(requestYear = 2099): RegionSearchCache | null {
  if (cache) return cache;

  const nationality = loadYearbookNationalityRegion(requestYear);
  const visa = loadYearbookVisaRegion(requestYear);
  if (!nationality && !visa) return null;

  const byKey = new Map<string, RegionAggregate>();
  const dataYear = nationality?.dataYear ?? visa!.dataYear;
  const editionYear = nationality?.editionYear ?? visa!.editionYear;

  const ensure = (sido: string, sigungu: string): RegionAggregate => {
    const key = regionKey(sido, sigungu);
    const existing = byKey.get(key);
    if (existing) return existing;

    const created: RegionAggregate = {
      sido,
      sigungu,
      totalCount: 0,
      visas: new Map(),
      nationalities: new Map(),
    };
    byKey.set(key, created);
    return created;
  };

  if (nationality) {
    for (const row of nationality.rows) {
      const sido = String(row["시도"] ?? "");
      const sigungu = String(row["시군구"] ?? "");
      const name = String(row["국적지역"] ?? "");
      const count = Number(row["등록외국인수"] ?? 0);
      if (!sido || !sigungu || !name || !count) continue;

      const bucket = ensure(sido, sigungu);
      bucket.nationalities.set(name, (bucket.nationalities.get(name) ?? 0) + count);
    }
  }

  if (visa) {
    for (const row of visa.rows) {
      const bucket = ensure(row.sido, row.sigungu);
      bucket.visas.set(
        row.visaLabel,
        (bucket.visas.get(row.visaLabel) ?? 0) + row.count
      );
    }
  }

  for (const region of Array.from(byKey.values())) {
    const visaTotal = Array.from(region.visas.values()).reduce((sum, count) => sum + count, 0);
    const nationalityTotal = Array.from(region.nationalities.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    region.totalCount = Math.max(visaTotal, nationalityTotal);
  }

  const regions = Array.from(byKey.values()).sort((a, b) => b.totalCount - a.totalCount);

  cache = {
    dataYear,
    editionYear,
    sourceMessage: `법무부 통계연보 ${editionYear}판 (${dataYear}년 연말 · 2장_Ⅱ_3 국적별 · 2장_Ⅱ_5 체류자격별)`,
    regions,
    byKey,
  };

  return cache;
}

function scoreMatch(region: RegionAggregate, query: string): number {
  const q = normalizeSearchText(query);
  const sigungu = normalizeSearchText(region.sigungu);
  const sido = normalizeSearchText(region.sido);
  const full = normalizeSearchText(`${region.sido}${region.sigungu}`);

  if (sigungu === q || full === q) return 100;
  if (sigungu.startsWith(q)) return 80;
  if (sigungu.includes(q)) return 60;
  if (full.includes(q)) return 40;
  if (sido.includes(q)) return 20;
  return 0;
}

export function searchRegionsByQuery(
  query: string,
  options?: { limit?: number }
): RegionSearchResponse {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      query: trimmed,
      dataYear: null,
      sourceMessage: "",
      matches: [],
      result: null,
      error: "검색어를 입력하세요.",
    };
  }

  const data = loadRegionSearchCache();
  if (!data) {
    return {
      query: trimmed,
      dataYear: null,
      sourceMessage: "",
      matches: [],
      result: null,
      error:
        "통계연보 데이터가 없습니다. .env.local에 YEARBOOK_XLSX_DIR을 설정하고 2장_Ⅱ_3·Ⅱ_5 엑셀을 넣어주세요.",
    };
  }

  const limit = options?.limit ?? 20;
  const scored = data.regions
    .map((region) => ({ region, score: scoreMatch(region, trimmed) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.region.totalCount - a.region.totalCount);

  const matches = scored.slice(0, limit).map((item) => toMatch(item.region));
  const top = scored[0];
  const result =
    top && top.score >= 60 && (scored.length === 1 || top.score - (scored[1]?.score ?? 0) >= 20)
      ? toMatch(top.region)
      : matches.length === 1
        ? matches[0]
        : null;

  return {
    query: trimmed,
    dataYear: data.dataYear,
    sourceMessage: data.sourceMessage,
    matches,
    result,
    error: matches.length ? undefined : `"${trimmed}"에 해당하는 시·군·구를 찾지 못했습니다.`,
  };
}

export function listPopularRegions(limit = 12): RegionSearchMatch[] {
  const data = loadRegionSearchCache();
  if (!data) return [];
  return data.regions.slice(0, limit).map(toMatch);
}

function matchesSidoQuery(regionSido: string, querySido: string): boolean {
  const region = normalizeSearchText(regionSido);
  const query = normalizeSearchText(querySido);
  if (!query) return false;
  if (region === query) return true;
  if (region.includes(query) || query.includes(region)) return true;
  const regionShort = region.replace(/광역시|특별시|특별자치시|특별자치도|도$/g, "");
  const queryShort = query.replace(/광역시|특별시|특별자치시|특별자치도|도$/g, "");
  return regionShort === queryShort || regionShort.includes(queryShort) || queryShort.includes(regionShort);
}

function matchesNationalityQuery(regionNationality: string, queryNationality: string): boolean {
  const region = normalizeSearchText(regionNationality);
  const query = normalizeSearchText(queryNationality);
  if (!query) return false;
  return region === query || region.includes(query) || query.includes(region);
}

export function listAvailableSido(): string[] {
  const data = loadRegionSearchCache();
  if (!data) return [];
  const sidoSet = new Set<string>();
  for (const region of data.regions) {
    sidoSet.add(region.sido);
  }
  return Array.from(sidoSet).sort((a, b) => a.localeCompare(b, "ko"));
}

export function loadSidoNationalityOverview(
  sidoQuery: string,
  nationalityQuery: string
): SidoNationalityOverviewResponse {
  const sido = sidoQuery.trim();
  const nationality = nationalityQuery.trim();
  const empty: SidoNationalityOverviewResponse = {
    sido,
    nationality,
    dataYear: null,
    sourceMessage: "",
    visaScopeNote: "",
    sidoNationalityTotal: 0,
    districts: [],
    availableSido: [],
    topNationalities: [],
  };

  if (!sido || !nationality) {
    return { ...empty, error: "시·도와 국적(지역)을 입력하세요." };
  }

  const data = loadRegionSearchCache();
  if (!data) {
    return {
      ...empty,
      error:
        "통계연보 데이터가 없습니다. .env.local에 YEARBOOK_XLSX_DIR을 설정하고 2장_Ⅱ_3·Ⅱ_5 엑셀을 넣어주세요.",
    };
  }

  const filtered = data.regions.filter((region) => matchesSidoQuery(region.sido, sido));
  if (!filtered.length) {
    return {
      ...empty,
      availableSido: listAvailableSido(),
      error: `"${sido}"에 해당하는 시·도를 찾지 못했습니다.`,
    };
  }

  const resolvedSido = filtered[0].sido;
  const regions = filtered.sort((a, b) => {
    const aCount =
      Array.from(a.nationalities.entries()).find(([name]) =>
        matchesNationalityQuery(name, nationality)
      )?.[1] ?? 0;
    const bCount =
      Array.from(b.nationalities.entries()).find(([name]) =>
        matchesNationalityQuery(name, nationality)
      )?.[1] ?? 0;
    return bCount - aCount;
  });

  const nationalityTotals = new Map<string, number>();
  let sidoNationalityTotal = 0;
  let resolvedNationality = nationality;
  const districts: SidoNationalityDistrictRow[] = [];

  for (const region of regions) {
    let nationalityCount = 0;

    for (const [name, count] of Array.from(region.nationalities.entries())) {
      nationalityTotals.set(name, (nationalityTotals.get(name) ?? 0) + count);
      if (matchesNationalityQuery(name, nationality)) {
        nationalityCount += count;
        resolvedNationality = name;
      }
    }

    if (!nationalityCount) continue;

    sidoNationalityTotal += nationalityCount;
    const visaRanking = toRanking(region.visas);
    districts.push({
      sigungu: region.sigungu,
      label: `${region.sido} ${region.sigungu}`,
      nationalityCount,
      nationalitySharePercent: null,
      totalForeigners: region.totalCount,
      topVisa: visaRanking[0] ?? null,
      visaRanking,
    });
  }

  for (const row of districts) {
    row.nationalitySharePercent =
      sidoNationalityTotal > 0 ? (row.nationalityCount / sidoNationalityTotal) * 100 : null;
  }

  districts.sort((a, b) => b.nationalityCount - a.nationalityCount);

  const topNationalities = toRanking(nationalityTotals, 12);

  return {
    sido: resolvedSido,
    nationality: resolvedNationality,
    dataYear: data.dataYear,
    sourceMessage: data.sourceMessage,
    visaScopeNote:
      "비자(체류자격) 순위는 해당 시·군·구 전체 등록외국인 기준입니다. 국적별 비자 교차 통계는 공개되지 않아, 베트남인만의 비자 분포는 별도 제공되지 않습니다.",
    sidoNationalityTotal,
    districts,
    availableSido: listAvailableSido(),
    topNationalities,
    error: districts.length
      ? undefined
      : `"${resolvedSido}"에서 "${nationality}" 국적(지역) 데이터를 찾지 못했습니다.`,
  };
}
