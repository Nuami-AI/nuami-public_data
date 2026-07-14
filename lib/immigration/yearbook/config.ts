import fs from "fs";
import path from "path";

/** 통계연보 엑셀 디렉터리 (예: Downloads/2025 출입국외국인정책 통계연보...) */
export function getYearbookDir(): string | null {
  const dir = process.env.YEARBOOK_XLSX_DIR?.trim();
  if (!dir || !fs.existsSync(dir)) return null;
  return dir;
}

export function findYearbookFile(
  dir: string,
  pattern: RegExp
): { filePath: string; editionYear: number } | null {
  const entries = fs.readdirSync(dir).filter((name) => /\.xlsx?$/i.test(name));
  let best: { filePath: string; editionYear: number } | null = null;

  for (const name of entries) {
    if (!pattern.test(name)) continue;
    const editionYear = extractEditionYear(name);
    if (!editionYear) continue;

    const candidate = { filePath: path.join(dir, name), editionYear };
    if (!best || candidate.editionYear > best.editionYear) {
      best = candidate;
    }
  }

  return best;
}

export function extractEditionYear(filename: string): number | null {
  const match = filename.match(/^(\d{4})\s/);
  return match ? Number(match[1]) : null;
}

/** 통계연보 N판 = 전년 연말 기준 통계 */
export function yearbookDataYear(editionYear: number): number {
  return editionYear - 1;
}

const NATIONALITY_REGION_CHAPTER = /2.{0,8}Ⅱ_3/i;

export function isNationalityRegionYearbookFile(filename: string): boolean {
  const normalized = filename.normalize("NFC");
  return (
    NATIONALITY_REGION_CHAPTER.test(normalized) &&
    normalized.includes("시군구") &&
    normalized.includes("국적") &&
    normalized.includes("등록외국인")
  );
}

const VISA_REGION_CHAPTER = /2.{0,8}Ⅱ_5/i;

export function isVisaRegionYearbookFile(filename: string): boolean {
  const normalized = filename.normalize("NFC");
  return (
    VISA_REGION_CHAPTER.test(normalized) &&
    normalized.includes("시군구") &&
    normalized.includes("체류자격") &&
    normalized.includes("등록외국인")
  );
}

const AGE_REGION_CHAPTER = /2.{0,8}Ⅱ_4/i;

export function isAgeRegionYearbookFile(filename: string): boolean {
  const normalized = filename.normalize("NFC");
  return (
    AGE_REGION_CHAPTER.test(normalized) &&
    normalized.includes("시군구") &&
    normalized.includes("연령") &&
    normalized.includes("등록외국인")
  );
}

const AGE_NATIONALITY_CHAPTER = /2.{0,8}Ⅱ_2/i;

export function isAgeNationalityYearbookFile(filename: string): boolean {
  const normalized = filename.normalize("NFC");
  return (
    AGE_NATIONALITY_CHAPTER.test(normalized) &&
    normalized.includes("연령") &&
    normalized.includes("등록외국인") &&
    !normalized.includes("시군구")
  );
}
