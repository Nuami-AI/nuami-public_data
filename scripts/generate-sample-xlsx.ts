/**
 * 샘플 XLSX 파일 생성 스크립트
 * 실행: npm run generate-xlsx
 */
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { MOCK_IMMIGRATION_STATS } from "../lib/immigration/mock";

const OUTPUT_DIR = path.join(process.cwd(), "data", "immigration");

function createWorkbookForStat(stat: (typeof MOCK_IMMIGRATION_STATS)[0]) {
  const rows = [
    ["체류외국인 통계", ""],
    ["기준연월", `${stat.year}년 ${stat.month}월`],
    ["", ""],
    ["구분", "인원(명)"],
    ["전체 체류외국인", stat.totalForeigners],
    ["단기체류외국인", stat.shortTermForeigners],
    ["장기체류외국인", stat.longTermForeigners],
    ["등록외국인", stat.registeredForeigners],
    ["거소신고자", stat.residenceReporters],
    ["", ""],
    ["자격별 등록외국인", ""],
    ["D-2 (유학)", stat.d2Students],
    ["D-4 (일반연수)", stat.d4Trainees],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "체류외국인통계");
  return wb;
}

function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const targetMonths = ["2026-03", "2026-04", "2026-05"];

  for (const dateKey of targetMonths) {
    const stat = MOCK_IMMIGRATION_STATS.find((s) => s.dateKey === dateKey);
    if (!stat) {
      console.warn(`Stat not found for ${dateKey}`);
      continue;
    }

    const wb = createWorkbookForStat(stat);
    const filePath = path.join(OUTPUT_DIR, `${dateKey}.xlsx`);
    XLSX.writeFile(wb, filePath);
    console.log(`Created: ${filePath}`);
  }

  console.log("Sample XLSX files generated successfully.");
}

main();
