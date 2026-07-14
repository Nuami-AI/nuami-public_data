import type { CellObject, WorkSheet } from "xlsx";
import * as XLSX from "xlsx";
import {
  METRIC_KEYWORDS,
  type ImmigrationMonthlyStat,
  type MetricKey,
} from "./types";
import { formatDateKey } from "./formatters";

export type RawSheetRow = Record<string, string | number>;

export type ParsedSheetData = {
  rows: RawSheetRow[];
  sheetName: string;
};

/** 셀 값을 문자열로 정규화 */
function cellToString(cell: CellObject | string | number | undefined): string {
  if (cell === undefined || cell === null) return "";
  if (typeof cell === "object" && "v" in cell) {
    return String(cell.v ?? "").trim();
  }
  return String(cell).trim();
}

/** 숫자 파싱 (콤마, 공백 제거) */
export function parseNumericValue(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && !Number.isNaN(value)) return Math.round(value);
  const cleaned = String(value).replace(/[,，\s명명]/g, "");
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : Math.round(num);
}

/** 파일명에서 연도/월 추출 (예: 2026-05.xlsx) */
export function parseDateFromFilename(filename: string): {
  year: number;
  month: number;
} | null {
  const match = filename.match(/(\d{4})-(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/** 시트를 2D 배열로 읽기 */
export function sheetToMatrix(sheet: WorkSheet): string[][] {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  const matrix: string[][] = [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      row.push(cellToString(cell));
    }
    matrix.push(row);
  }
  return matrix;
}

/** 키워드로 행/열에서 값 탐색 */
export function findValueByKeywords(
  matrix: string[][],
  keywords: string[]
): number | null {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      const cell = matrix[r][c];
      if (!cell) continue;

      const matched = keywords.some((kw) => cell.includes(kw));
      if (!matched) continue;

      // 같은 행 오른쪽에서 숫자 탐색
      for (let nc = c + 1; nc < matrix[r].length; nc++) {
        const val = parseNumericValue(matrix[r][nc]);
        if (val !== null) return val;
      }

      // 아래 행 같은 열에서 숫자 탐색
      for (let nr = r + 1; nr < Math.min(r + 4, matrix.length); nr++) {
        const val = parseNumericValue(matrix[nr][c]);
        if (val !== null) return val;
      }
    }
  }
  return null;
}

/** XLSX 버퍼에서 단일 월 통계 추출 */
export function parseWorkbookBuffer(
  buffer: Buffer,
  filename: string
): ImmigrationMonthlyStat | null {
  const dateFromFile = parseDateFromFilename(filename);
  if (!dateFromFile) return null;

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return null;
  }

  const metrics: Partial<Record<MetricKey, number>> = {};

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const matrix = sheetToMatrix(sheet);

    for (const [key, keywords] of Object.entries(METRIC_KEYWORDS) as [
      MetricKey,
      string[],
    ][]) {
      if (metrics[key] !== undefined) continue;
      const value = findValueByKeywords(matrix, keywords);
      if (value !== null) metrics[key] = value;
    }
  }

  const { year, month } = dateFromFile;

  // 장기 = 등록 + 거소 (누락 시 계산)
  if (
    metrics.longTermForeigners === undefined &&
    metrics.registeredForeigners !== undefined &&
    metrics.residenceReporters !== undefined
  ) {
    metrics.longTermForeigners =
      metrics.registeredForeigners + metrics.residenceReporters;
  }

  // 전체 = 단기 + 장기 (누락 시 계산)
  if (
    metrics.totalForeigners === undefined &&
    metrics.shortTermForeigners !== undefined &&
    metrics.longTermForeigners !== undefined
  ) {
    metrics.totalForeigners =
      metrics.shortTermForeigners + metrics.longTermForeigners;
  }

  const required: MetricKey[] = [
    "totalForeigners",
    "shortTermForeigners",
    "longTermForeigners",
    "registeredForeigners",
    "residenceReporters",
    "d2Students",
    "d4Trainees",
  ];

  const missing = required.filter((k) => metrics[k] === undefined);
  if (missing.length > 0) {
    console.warn(`[parser] ${filename} 누락 지표: ${missing.join(", ")}`);
    return null;
  }

  return {
    year,
    month,
    dateKey: formatDateKey(year, month),
    totalForeigners: metrics.totalForeigners!,
    shortTermForeigners: metrics.shortTermForeigners!,
    longTermForeigners: metrics.longTermForeigners!,
    registeredForeigners: metrics.registeredForeigners!,
    residenceReporters: metrics.residenceReporters!,
    d2Students: metrics.d2Students!,
    d4Trainees: metrics.d4Trainees!,
  };
}

/** 시트 구조 분석 (디버그/확장용) */
export function analyzeSheetStructure(sheet: WorkSheet): {
  rowCount: number;
  colCount: number;
  sampleRows: string[][];
} {
  const matrix = sheetToMatrix(sheet);
  return {
    rowCount: matrix.length,
    colCount: matrix[0]?.length ?? 0,
    sampleRows: matrix.slice(0, 10),
  };
}
