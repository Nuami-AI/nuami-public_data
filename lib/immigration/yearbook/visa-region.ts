import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { parseNumericValue } from "../parser";
import {
  extractEditionYear,
  getYearbookDir,
  isVisaRegionYearbookFile,
  yearbookDataYear,
} from "./config";

export type VisaRegionRow = {
  year: number;
  sido: string;
  sigungu: string;
  visaLabel: string;
  count: number;
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

function parseVisaRegionMatrix(matrix: string[][], dataYear: number): VisaRegionRow[] {
  if (matrix.length < 2) return [];

  const headers = matrix[0];
  const visaStartCol = 4;
  const rows: VisaRegionRow[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    const gender = String(row[2] ?? "").trim();
    if (gender !== "총계") continue;

    const sido = String(row[0] ?? "").trim();
    const sigungu = String(row[1] ?? "").trim();
    if (!sido || !sigungu || isAggregateLabel(sido) || isAggregateLabel(sigungu)) {
      continue;
    }

    for (let c = visaStartCol; c < headers.length; c++) {
      const visaLabel = String(headers[c] ?? "").trim();
      const count = parseNumericValue(row[c]);
      if (!visaLabel || count === null || count <= 0) continue;
      if (isAggregateLabel(visaLabel)) continue;

      rows.push({
        year: dataYear,
        sido,
        sigungu,
        visaLabel,
        count,
      });
    }
  }

  return rows;
}

export type YearbookVisaRegionResult = {
  rows: VisaRegionRow[];
  dataYear: number;
  editionYear: number;
  sourceFile: string;
  sourceMessage: string;
};

export function loadYearbookVisaRegion(
  requestYear: number
): YearbookVisaRegionResult | null {
  const dir = getYearbookDir();
  if (!dir) return null;

  const entries = fs.readdirSync(dir).filter((name) => /\.xlsx?$/i.test(name));
  let match: { filePath: string; editionYear: number } | null = null;

  for (const name of entries) {
    if (!isVisaRegionYearbookFile(name)) continue;
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
  const rows = parseVisaRegionMatrix(matrix, resolvedDataYear);
  if (!rows.length) return null;

  return {
    rows,
    dataYear: resolvedDataYear,
    editionYear: match.editionYear,
    sourceFile: match.filePath,
    sourceMessage: `법무부 통계연보 ${match.editionYear}판 2장_Ⅱ_5 (${resolvedDataYear}년 연말 기준)`,
  };
}
