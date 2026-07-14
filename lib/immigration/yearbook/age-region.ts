import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { parseNumericValue } from "../parser";
import {
  extractEditionYear,
  getYearbookDir,
  isAgeRegionYearbookFile,
  yearbookDataYear,
} from "./config";

export type AgeGenderRow = {
  year: number;
  sido: string;
  sigungu: string;
  ageBand: string;
  male: number;
  female: number;
  total: number;
};

function isAggregateLabel(label: string): boolean {
  const normalized = label.replace(/\s/g, "");
  return (
    normalized.includes("합계") ||
    normalized.includes("전체") ||
    normalized.includes("총계") ||
    normalized === "총합계"
  );
}

function normalizeAgeBand(label: string): string {
  return label
    .replace(/\s/g, "")
    .replace(/세이상/g, "세 이상")
    .replace(/~/g, "~")
    .trim();
}

function parseAgeRegionMatrix(matrix: string[][]): AgeGenderRow[] {
  if (matrix.length < 2) return [];

  const headers = matrix[0];
  const ageStartCol = 4;
  const byRegionGender = new Map<string, Map<string, { male: number; female: number }>>();

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    const gender = String(row[2] ?? "").trim();
    if (gender !== "남성" && gender !== "여성") continue;

    const sido = String(row[0] ?? "").trim();
    const sigungu = String(row[1] ?? "").trim();
    if (!sido || !sigungu || isAggregateLabel(sido) || isAggregateLabel(sigungu)) continue;

    const regionKey = `${sido}|${sigungu}`;
    const ageMap = byRegionGender.get(regionKey) ?? new Map();

    for (let c = ageStartCol; c < headers.length; c++) {
      const ageBand = normalizeAgeBand(String(headers[c] ?? ""));
      const count = parseNumericValue(row[c]);
      if (!ageBand || count === null || count < 0) continue;

      const bucket = ageMap.get(ageBand) ?? { male: 0, female: 0 };
      if (gender === "남성") bucket.male += count;
      else bucket.female += count;
      ageMap.set(ageBand, bucket);
    }

    byRegionGender.set(regionKey, ageMap);
  }

  const rows: AgeGenderRow[] = [];
  for (const [regionKey, ageMap] of Array.from(byRegionGender.entries())) {
    const [sido, sigungu] = regionKey.split("|");
    for (const [ageBand, counts] of Array.from(ageMap.entries())) {
      rows.push({
        year: 0,
        sido,
        sigungu,
        ageBand,
        male: counts.male,
        female: counts.female,
        total: counts.male + counts.female,
      });
    }
  }

  return rows;
}

export type YearbookAgeRegionResult = {
  rows: AgeGenderRow[];
  dataYear: number;
  editionYear: number;
  sourceFile: string;
  sourceMessage: string;
};

export function loadYearbookAgeRegion(
  requestYear: number
): YearbookAgeRegionResult | null {
  const dir = getYearbookDir();
  if (!dir) return null;

  const entries = fs.readdirSync(dir).filter((name) => /\.xlsx?$/i.test(name));
  let match: { filePath: string; editionYear: number } | null = null;

  for (const name of entries) {
    if (!isAgeRegionYearbookFile(name)) continue;
    const editionYear = extractEditionYear(name);
    if (!editionYear) continue;
    const candidate = { filePath: path.join(dir, name), editionYear };
    if (!match || candidate.editionYear > match.editionYear) {
      match = candidate;
    }
  }

  if (!match) return null;

  const dataYear = yearbookDataYear(match.editionYear);
  if (dataYear > requestYear) return null;

  const buffer = fs.readFileSync(match.filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName =
    workbook.SheetNames.find((name) => /^\d{4}$/.test(name)) ??
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return null;

  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
  }) as string[][];

  const sheetYear = extractEditionYear(`${sheetName} `) ?? match.editionYear;
  const resolvedDataYear = yearbookDataYear(sheetYear);
  const rows = parseAgeRegionMatrix(matrix).map((row) => ({
    ...row,
    year: resolvedDataYear,
  }));

  if (!rows.length) return null;

  return {
    rows,
    dataYear: resolvedDataYear,
    editionYear: match.editionYear,
    sourceFile: match.filePath,
    sourceMessage: `법무부 통계연보 ${match.editionYear}판 2장_Ⅱ_4 (${resolvedDataYear}년 연말 기준)`,
  };
}

export function getAgeGenderForRegion(
  rows: AgeGenderRow[],
  sido: string,
  sigungu: string
): AgeGenderRow[] {
  return rows
    .filter((row) => row.sido === sido && row.sigungu === sigungu)
    .sort((a, b) => b.total - a.total);
}
