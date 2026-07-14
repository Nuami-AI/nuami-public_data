import { z } from "zod";

export const ImmigrationMonthlyStatSchema = z.object({
  year: z.number().int().min(2000),
  month: z.number().int().min(1).max(12),
  dateKey: z.string().regex(/^\d{4}-\d{2}$/),
  totalForeigners: z.number().nonnegative(),
  shortTermForeigners: z.number().nonnegative(),
  longTermForeigners: z.number().nonnegative(),
  registeredForeigners: z.number().nonnegative(),
  residenceReporters: z.number().nonnegative(),
  d2Students: z.number().nonnegative(),
  d4Trainees: z.number().nonnegative(),
});

export type ImmigrationMonthlyStat = z.infer<typeof ImmigrationMonthlyStatSchema>;

export type MetricKey =
  | "totalForeigners"
  | "shortTermForeigners"
  | "longTermForeigners"
  | "registeredForeigners"
  | "residenceReporters"
  | "d2Students"
  | "d4Trainees";

export type PeriodView = "monthly" | "yearly";

export type ComparisonResult = {
  delta: number | null;
  rate: number | null;
};

export type StatWithComparisons = ImmigrationMonthlyStat & {
  mom: Record<MetricKey, ComparisonResult>;
  yoy: Record<MetricKey, ComparisonResult>;
};

export type YearlySummary = {
  year: number;
  totalForeigners: number;
  shortTermForeigners: number;
  longTermForeigners: number;
  registeredForeigners: number;
  residenceReporters: number;
  d2Students: number;
  d4Trainees: number;
  monthsCount: number;
};

export type ImmigrationApiResponse = {
  stats: StatWithComparisons[];
  yearlySummaries: YearlySummary[];
  availableYears: number[];
  source: "api";
  sourceMessage: string;
  lastUpdated: string | null;
};

export type VisaBreakdownItem = {
  code: string;
  label: string;
  count: number;
};

export type VisaBreakdownResponse = {
  year: number;
  month: number;
  dateKey: string;
  focus: VisaBreakdownItem[];
  reference: VisaBreakdownItem[];
  all: VisaBreakdownItem[];
};

export type RankingItem = {
  name: string;
  count: number;
};

export type RankingItemWithShare = RankingItem & {
  sharePercent: number | null;
};

export type AgeGenderBand = {
  ageBand: string;
  male: number;
  female: number;
  total: number;
};

export type PopulationRatioSnapshot = {
  residentPopulation: number;
  foreignerPopulation: number;
  foreignerSharePercent: number;
  period: string;
  scope: "national" | "sido" | "sigungu";
  sourceMessage: string;
};

export type PopulationRatioTrendPoint = {
  period: string;
  year: number;
  month?: number;
  residentPopulation: number;
  foreignerPopulation: number;
  foreignerSharePercent: number;
};

export type PopulationRatioTrendResponse = {
  periodView: "monthly" | "yearly";
  year?: number;
  points: PopulationRatioTrendPoint[];
  sourceMessage: string;
};

export type RegionDetailResponse = {
  query: string;
  label: string;
  sido: string;
  sigungu: string;
  year: number;
  month: number;
  dateKey: string;
  foreignerCount: number;
  nationalForeignerCount: number;
  nationalSharePercent: number | null;
  sidoRanking: RankingItemWithShare[];
  sigunguRanking: RankingItemWithShare[];
  nationalityRanking: RankingItemWithShare[];
  visaRanking: RankingItemWithShare[];
  ageGenderBands: AgeGenderBand[];
  yearlyForeignerTrend: Array<{ year: number; count: number }>;
  populationRatio: PopulationRatioSnapshot | null;
  populationRatioTrend: PopulationRatioTrendPoint[];
  studentContext?: StudentVisaRegionContext;
  yearbookDataYear: number | null;
  sourceMessage: string;
  error?: string;
};

export type NationalityDetailItem = RankingItem & {
  mom: ComparisonResult;
  topRegions: RankingItem[];
};

export type VisaDetailResponse = {
  visaCode: string;
  visaLabel: string;
  year: number;
  month: number;
  dateKey: string;
  totalCount: number;
  nationalityRanking: NationalityDetailItem[];
  regionRanking: RankingItem[];
  detailAvailable: boolean;
  nationalitySource: "student_visa" | "registered_foreigners" | "none";
  regionDetailAvailable: boolean;
  regionReferenceYear: number | null;
  sourceNote: string;
};

export type MonthlyTrendPoint = {
  month: number;
  label: string;
  [country: string]: number | string;
};

export type GlobalImmigrationResponse = {
  year: number;
  totalCount: number;
  ranking: RankingItem[];
  topCountries: RankingItem[];
  yearlyTrend: MonthlyTrendPoint[];
  availableYears: number[];
  source: "un_desa_world_bank";
  sourceMessage: string;
};

export type SigunguRankingItem = RankingItem & {
  sido: string;
};

export type DomesticImmigrationResponse = {
  year: number;
  month: number;
  dateKey: string;
  totalCount: number;
  sidoRanking: RankingItem[];
  sigunguRanking: SigunguRankingItem[];
  availableYears: number[];
  availableSido: string[];
  selectedSido: string | null;
  metricScope: "longTerm" | "registered";
  metricLabel: string;
  metricNote?: string;
  sourceMessage: string;
};

export type UniversityInRegion = {
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

export type StudentVisaRegionContext = {
  d2Count: number;
  d4Count: number;
  universitiesInRegion: UniversityInRegion[];
  nearbyUniversities: UniversityInRegion[];
  universitySourceMessage: string;
};

export type RegionSearchMatch = {
  sido: string;
  sigungu: string;
  label: string;
  totalCount: number;
  visaRanking: RankingItem[];
  nationalityRanking: RankingItem[];
  studentContext?: StudentVisaRegionContext;
};

export type RegionSearchResponse = {
  query: string;
  dataYear: number | null;
  sourceMessage: string;
  matches: RegionSearchMatch[];
  result: RegionSearchMatch | null;
  error?: string;
};

export type SidoNationalityDistrictRow = {
  sigungu: string;
  label: string;
  nationalityCount: number;
  nationalitySharePercent: number | null;
  totalForeigners: number;
  topVisa: RankingItem | null;
  visaRanking: RankingItem[];
};

export type SidoNationalityOverviewResponse = {
  sido: string;
  nationality: string;
  dataYear: number | null;
  sourceMessage: string;
  visaScopeNote: string;
  sidoNationalityTotal: number;
  districts: SidoNationalityDistrictRow[];
  availableSido: string[];
  topNationalities: RankingItem[];
  error?: string;
};

export const METRIC_LABELS: Record<MetricKey, string> = {
  totalForeigners: "전체 체류외국인",
  shortTermForeigners: "단기체류외국인",
  longTermForeigners: "장기체류외국인",
  registeredForeigners: "등록외국인",
  residenceReporters: "거소신고자",
  d2Students: "D-2 유학",
  d4Trainees: "D-4 일반연수",
};

export const METRIC_DESCRIPTIONS: Record<MetricKey, string> = {
  totalForeigners: "단기·장기 체류외국인을 합산한 전체 인원",
  shortTermForeigners: "90일 이하 단기 체류 외국인",
  longTermForeigners: "90일 초과 장기 체류 외국인",
  registeredForeigners: "외국인등록을 완료한 장기체류 외국인",
  residenceReporters: "거소신고를 한 장기체류 외국인",
  d2Students: "유학(D-2) 체류자격 소지자",
  d4Trainees: "일반연수(D-4) 체류자격 소지자",
};

export const METRIC_COLORS: Record<MetricKey, string> = {
  totalForeigners: "#2563eb",
  shortTermForeigners: "#14b8a6",
  longTermForeigners: "#f472b6",
  registeredForeigners: "#8b5cf6",
  residenceReporters: "#ec4899",
  d2Students: "#3b82f6",
  d4Trainees: "#06b6d4",
};

export const METRIC_KEYS: MetricKey[] = [
  "totalForeigners",
  "shortTermForeigners",
  "longTermForeigners",
  "registeredForeigners",
  "residenceReporters",
  "d2Students",
  "d4Trainees",
];

/** 원본 XLSX에서 찾을 키워드 매핑 */
export const METRIC_KEYWORDS: Record<MetricKey, string[]> = {
  totalForeigners: ["전체 체류외국인", "체류외국인 수", "체류외국인"],
  shortTermForeigners: ["단기체류외국인", "단기 체류외국인"],
  longTermForeigners: ["장기체류외국인", "장기 체류외국인"],
  registeredForeigners: ["등록외국인"],
  residenceReporters: ["거소신고자", "거소 신고자"],
  d2Students: ["D-2", "유학", "D2"],
  d4Trainees: ["D-4", "일반연수", "D4"],
};
