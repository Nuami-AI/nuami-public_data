import { MIN_COLLECTION_YEAR } from "../constants";

/** 공공데이터포털 파일데이터 → odcloud API 데이터셋 ID (고정) */
export const ODCLOUD_DATASETS = {
  monthly: "15100009",
  yearly: "15100007",
  visa: "15100016",
  visaYearly: "15100015",
  nationality: "15100020",
  region: "15100022",
  stayingNationality: "15100013",
  studentNationality: "15100039",
  nationalityRegion: "15108413",
  residenceRegion: "15155792",
  longTermRegion: "15125383",
} as const;

export type PublicApiConfig = {
  serviceKey: string;
  monthlyPath: string;
  yearlyPath: string;
  visaPath: string;
  visaYearlyPath: string;
  nationalityPath: string;
  regionPath: string;
  residenceRegionPath: string;
  longTermRegionPath: string;
  stayingNationalityPath: string;
  studentNationalityPath: string;
  nationalityRegionPath: string;
  baseUrl: string;
  minYear: number;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`필수 환경변수 ${name}가 설정되지 않았습니다.`);
  }
  return value;
}

function buildPath(datasetId: string, uddi: string): string {
  const normalized = uddi.startsWith("uddi:") ? uddi : `uddi:${uddi}`;
  return `${datasetId}/v1/${normalized}`;
}

/** ODCLOUD_MONTHLY_UDDI 또는 레거시 ODCLOUD_MONTHLY_PATH 지원 */
function resolvePath(
  uddiEnv: string,
  legacyPathEnv: string | undefined,
  datasetId: string
): string {
  const legacy = legacyPathEnv?.trim();
  if (legacy) return legacy;

  const uddi = requireEnv(uddiEnv);
  return buildPath(datasetId, uddi);
}

function isPlaceholderUddi(uddi: string): boolean {
  const normalized = uddi.toLowerCase();
  return (
    normalized.startsWith("your-") ||
    normalized.includes("uuid") ||
    normalized === "placeholder"
  );
}

function isValidUddi(uddi: string): boolean {
  if (isPlaceholderUddi(uddi)) return false;
  const uuid = uddi.replace(/^uddi:/i, "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    uuid
  );
}

function resolveOptionalPath(
  uddiEnv: string | undefined,
  legacyPathEnv: string | undefined,
  datasetId: string
): string {
  const legacy = legacyPathEnv?.trim();
  if (legacy) return legacy;

  const uddi = uddiEnv?.trim();
  if (!uddi || !isValidUddi(uddi)) return "";

  return buildPath(datasetId, uddi);
}

export function getPublicApiConfig(): PublicApiConfig {
  const minYear = Number(process.env.ODCLOUD_MIN_YEAR ?? MIN_COLLECTION_YEAR);

  return {
    serviceKey: requireEnv("DATA_GO_KR_SERVICE_KEY"),
    monthlyPath: resolvePath(
      "ODCLOUD_MONTHLY_UDDI",
      process.env.ODCLOUD_MONTHLY_PATH,
      ODCLOUD_DATASETS.monthly
    ),
    yearlyPath: resolvePath(
      "ODCLOUD_YEARLY_UDDI",
      process.env.ODCLOUD_YEARLY_PATH,
      ODCLOUD_DATASETS.yearly
    ),
    visaPath: resolvePath(
      "ODCLOUD_VISA_UDDI",
      process.env.ODCLOUD_VISA_PATH,
      ODCLOUD_DATASETS.visa
    ),
    visaYearlyPath: resolveOptionalPath(
      process.env.ODCLOUD_VISA_YEARLY_UDDI,
      process.env.ODCLOUD_VISA_YEARLY_PATH,
      ODCLOUD_DATASETS.visaYearly
    ),
    nationalityPath: resolveOptionalPath(
      process.env.ODCLOUD_NATIONALITY_UDDI,
      process.env.ODCLOUD_NATIONALITY_PATH,
      ODCLOUD_DATASETS.nationality
    ),
    regionPath: resolveOptionalPath(
      process.env.ODCLOUD_REGION_UDDI,
      process.env.ODCLOUD_REGION_PATH,
      ODCLOUD_DATASETS.region
    ),
    residenceRegionPath: resolveOptionalPath(
      process.env.ODCLOUD_RESIDENCE_REGION_UDDI,
      process.env.ODCLOUD_RESIDENCE_REGION_PATH,
      ODCLOUD_DATASETS.residenceRegion
    ),
    longTermRegionPath: resolveOptionalPath(
      process.env.ODCLOUD_LONGTERM_REGION_UDDI,
      process.env.ODCLOUD_LONGTERM_REGION_PATH,
      ODCLOUD_DATASETS.longTermRegion
    ),
    stayingNationalityPath: resolveOptionalPath(
      process.env.ODCLOUD_STAYING_NATIONALITY_UDDI,
      process.env.ODCLOUD_STAYING_NATIONALITY_PATH,
      ODCLOUD_DATASETS.stayingNationality
    ),
    studentNationalityPath: resolveOptionalPath(
      process.env.ODCLOUD_STUDENT_NATIONALITY_UDDI,
      process.env.ODCLOUD_STUDENT_NATIONALITY_PATH,
      ODCLOUD_DATASETS.studentNationality
    ),
    nationalityRegionPath: resolveOptionalPath(
      process.env.ODCLOUD_NATIONALITY_REGION_UDDI,
      process.env.ODCLOUD_NATIONALITY_REGION_PATH,
      ODCLOUD_DATASETS.nationalityRegion
    ),
    baseUrl:
      process.env.ODCLOUD_BASE_URL?.trim() || "https://api.odcloud.kr/api",
    minYear: Number.isFinite(minYear) ? minYear : MIN_COLLECTION_YEAR,
  };
}
