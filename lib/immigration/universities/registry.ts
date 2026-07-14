import schoolsData from "./schools.json";
import { regionKey } from "./parse-address";
import type { UniversityInRegion } from "../types";

type SchoolRecord = {
  name: string;
  campusType: string;
  schoolCategory: string;
  schoolType: string;
  establishment: string;
  sido: string;
  sigungu: string;
  address: string;
  homepage?: string;
  isCyber: boolean;
};

type UniversityCache = {
  sourceMessage: string;
  byRegion: Map<string, UniversityInRegion[]>;
  bySido: Map<string, UniversityInRegion[]>;
};

let cache: UniversityCache | null = null;

function toUniversity(record: SchoolRecord): UniversityInRegion {
  return {
    name: record.name,
    campusType: record.campusType,
    schoolCategory: record.schoolCategory,
    schoolType: record.schoolType,
    establishment: record.establishment,
    sido: record.sido,
    sigungu: record.sigungu,
    address: record.address,
    homepage: record.homepage,
    isCyber: record.isCyber,
  };
}

function loadUniversityCache(): UniversityCache {
  if (cache) return cache;

  const byRegion = new Map<string, UniversityInRegion[]>();
  const bySido = new Map<string, UniversityInRegion[]>();

  for (const record of schoolsData.schools as SchoolRecord[]) {
    const university = toUniversity(record);
    const key = regionKey(record.sido, record.sigungu);
    const regionList = byRegion.get(key) ?? [];
    regionList.push(university);
    byRegion.set(key, regionList);

    const sidoList = bySido.get(record.sido) ?? [];
    sidoList.push(university);
    bySido.set(record.sido, sidoList);
  }

  for (const list of Array.from(byRegion.values())) {
    list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }
  for (const list of Array.from(bySido.values())) {
    list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }

  cache = {
    sourceMessage: `${schoolsData.source} · ${schoolsData.count}개 교육기관 (${schoolsData.generatedAt} 생성)`,
    byRegion,
    bySido,
  };

  return cache;
}

export function getUniversitiesInRegion(sido: string, sigungu: string): UniversityInRegion[] {
  const data = loadUniversityCache();
  return data.byRegion.get(regionKey(sido, sigungu)) ?? [];
}

export function getNearbyUniversitiesInSido(
  sido: string,
  sigungu: string,
  limit = 12
): UniversityInRegion[] {
  const data = loadUniversityCache();
  const currentKey = regionKey(sido, sigungu);
  const seen = new Set<string>();

  return (data.bySido.get(sido) ?? [])
    .filter((university) => {
      const key = regionKey(university.sido, university.sigungu);
      if (key === currentKey) return false;
      const dedupeKey = `${university.name}|${university.address}`;
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    })
    .slice(0, limit);
}

export function getUniversitySourceMessage(): string {
  return loadUniversityCache().sourceMessage;
}

export function countUniversities(): number {
  return schoolsData.count;
}
