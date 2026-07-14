import type { ImmigrationMonthlyStat } from "./types";

/** 법무부 스타일 대시보드 기준 mock 데이터 (2025-2026) */
export const MOCK_IMMIGRATION_STATS: ImmigrationMonthlyStat[] = [
  // 2025
  { year: 2025, month: 1, dateKey: "2025-01", totalForeigners: 2710000, shortTermForeigners: 610000, longTermForeigners: 2100000, registeredForeigners: 1580000, residenceReporters: 520000, d2Students: 228000, d4Trainees: 72000 },
  { year: 2025, month: 2, dateKey: "2025-02", totalForeigners: 2725000, shortTermForeigners: 615000, longTermForeigners: 2110000, registeredForeigners: 1585000, residenceReporters: 525000, d2Students: 229000, d4Trainees: 72500 },
  { year: 2025, month: 3, dateKey: "2025-03", totalForeigners: 2740000, shortTermForeigners: 620000, longTermForeigners: 2120000, registeredForeigners: 1590000, residenceReporters: 530000, d2Students: 230000, d4Trainees: 73000 },
  { year: 2025, month: 4, dateKey: "2025-04", totalForeigners: 2755000, shortTermForeigners: 625000, longTermForeigners: 2130000, registeredForeigners: 1595000, residenceReporters: 535000, d2Students: 231000, d4Trainees: 73500 },
  { year: 2025, month: 5, dateKey: "2025-05", totalForeigners: 2770000, shortTermForeigners: 630000, longTermForeigners: 2140000, registeredForeigners: 1600000, residenceReporters: 540000, d2Students: 232000, d4Trainees: 74000 },
  { year: 2025, month: 6, dateKey: "2025-06", totalForeigners: 2785000, shortTermForeigners: 635000, longTermForeigners: 2150000, registeredForeigners: 1605000, residenceReporters: 545000, d2Students: 233000, d4Trainees: 74500 },
  { year: 2025, month: 7, dateKey: "2025-07", totalForeigners: 2800000, shortTermForeigners: 640000, longTermForeigners: 2160000, registeredForeigners: 1610000, residenceReporters: 550000, d2Students: 234000, d4Trainees: 75000 },
  { year: 2025, month: 8, dateKey: "2025-08", totalForeigners: 2815000, shortTermForeigners: 645000, longTermForeigners: 2170000, registeredForeigners: 1615000, residenceReporters: 555000, d2Students: 235000, d4Trainees: 75500 },
  { year: 2025, month: 9, dateKey: "2025-09", totalForeigners: 2830000, shortTermForeigners: 648000, longTermForeigners: 2182000, registeredForeigners: 1620000, residenceReporters: 562000, d2Students: 236000, d4Trainees: 76000 },
  { year: 2025, month: 10, dateKey: "2025-10", totalForeigners: 2845000, shortTermForeigners: 650000, longTermForeigners: 2195000, registeredForeigners: 1625000, residenceReporters: 570000, d2Students: 237000, d4Trainees: 76500 },
  { year: 2025, month: 11, dateKey: "2025-11", totalForeigners: 2858000, shortTermForeigners: 652000, longTermForeigners: 2206000, registeredForeigners: 1630000, residenceReporters: 576000, d2Students: 238000, d4Trainees: 77000 },
  { year: 2025, month: 12, dateKey: "2025-12", totalForeigners: 2870000, shortTermForeigners: 655000, longTermForeigners: 2215000, registeredForeigners: 1635000, residenceReporters: 580000, d2Students: 239000, d4Trainees: 77500 },
  // 2026
  { year: 2026, month: 1, dateKey: "2026-01", totalForeigners: 2855000, shortTermForeigners: 648000, longTermForeigners: 2207000, registeredForeigners: 1628000, residenceReporters: 579000, d2Students: 238500, d4Trainees: 77200 },
  { year: 2026, month: 2, dateKey: "2026-02", totalForeigners: 2862000, shortTermForeigners: 650000, longTermForeigners: 2212000, registeredForeigners: 1632000, residenceReporters: 580000, d2Students: 238800, d4Trainees: 77400 },
  { year: 2026, month: 3, dateKey: "2026-03", totalForeigners: 2868000, shortTermForeigners: 651500, longTermForeigners: 2216500, registeredForeigners: 1636000, residenceReporters: 580500, d2Students: 239000, d4Trainees: 77600 },
  { year: 2026, month: 4, dateKey: "2026-04", totalForeigners: 2874000, shortTermForeigners: 652200, longTermForeigners: 2221800, registeredForeigners: 1640000, residenceReporters: 581800, d2Students: 239200, d4Trainees: 77800 },
  { year: 2026, month: 5, dateKey: "2026-05", totalForeigners: 2870191, shortTermForeigners: 652909, longTermForeigners: 2217282, registeredForeigners: 1626965, residenceReporters: 590317, d2Students: 239000, d4Trainees: 78000 },
];

export function getMockStats(): ImmigrationMonthlyStat[] {
  return [...MOCK_IMMIGRATION_STATS];
}
