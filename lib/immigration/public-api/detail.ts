import { formatDateKey } from "../formatters";
import type { VisaDetailResponse } from "../types";
import { loadYearbookNationalityRegion } from "../yearbook/nationality-region";
import { buildVisaBreakdown } from "../visa";
import { getPublicApiConfig } from "./config";
import { fetchOptionalOdcloudRows, fetchAllOdcloudRows, PublicApiError } from "./client";
import {
  attachNationalityTopRegions,
  buildNationalityRankingWithMom,
  buildSidoRanking,
  type RawRow,
} from "./ranking";

const FOCUS_VISAS = new Set(["D-2", "D-4"]);

export async function loadVisaBreakdownForPeriod(
  year: number,
  month: number
): Promise<{ items: ReturnType<typeof buildVisaBreakdown>; totalRows: number }> {
  const config = getPublicApiConfig();
  const rows = await fetchAllOdcloudRows(config, config.visaPath, 1000, {
    minYear: config.minYear,
  });

  return {
    items: buildVisaBreakdown(rows, year, month),
    totalRows: rows.length,
  };
}

export async function loadVisaDetail(
  visaCode: string,
  year: number,
  month: number
): Promise<VisaDetailResponse> {
  const config = getPublicApiConfig();
  const normalizedCode = visaCode.toUpperCase().replace(/\s/g, "");
  const dateKey = formatDateKey(year, month);
  const useStudentNationality =
    FOCUS_VISAS.has(normalizedCode) && Boolean(config.studentNationalityPath);

  const [visaResult, nationalityRows, studentRows, regionRows] =
    await Promise.all([
      loadVisaBreakdownForPeriod(year, month),
      fetchOptionalOdcloudRows<RawRow>(config, config.nationalityPath, 1000, {
        minYear: config.minYear,
      }),
      useStudentNationality
        ? fetchOptionalOdcloudRows<RawRow>(
            config,
            config.studentNationalityPath,
            1000,
            { minYear: config.minYear }
          )
        : Promise.resolve([] as RawRow[]),
      fetchOptionalOdcloudRows<RawRow>(config, config.regionPath, 1000, {
        minYear: config.minYear,
      }),
    ]);

  const visaItem = visaResult.items.find(
    (item) => item.code.toUpperCase().replace(/\s/g, "") === normalizedCode
  );

  if (!visaItem) {
    throw new PublicApiError(
      `${year}년 ${month}월 ${visaCode} 데이터를 찾을 수 없습니다.`
    );
  }

  const nationalitySourceRows = useStudentNationality ? studentRows : nationalityRows;
  let nationalitySource: VisaDetailResponse["nationalitySource"] = "none";

  if (useStudentNationality && studentRows.length > 0) {
    nationalitySource = "student_visa";
  } else if (nationalityRows.length > 0) {
    nationalitySource = "registered_foreigners";
  }

  let nationalityRanking = nationalitySourceRows.length
    ? buildNationalityRankingWithMom(nationalitySourceRows, year, month, {
        visaCode: normalizedCode,
        useStudentRows: useStudentNationality && studentRows.length > 0,
      })
    : [];

  const regionRanking = regionRows.length
    ? buildSidoRanking(regionRows, year, month)
    : [];

  const yearbookRegion = loadYearbookNationalityRegion(year);
  let regionDetailAvailable = false;
  let regionReferenceYear: number | null = null;

  if (yearbookRegion) {
    nationalityRanking = attachNationalityTopRegions(
      nationalityRanking,
      yearbookRegion.rows,
      yearbookRegion.dataYear,
      12
    );
    regionDetailAvailable = nationalityRanking.some((item) => item.topRegions.length > 0);
    regionReferenceYear = yearbookRegion.dataYear;
  }

  const detailAvailable = nationalityRanking.length > 0;
  let sourceNote = "체류자격별 인원은 공공데이터 API(15100016) 기준입니다.";

  if (!detailAvailable) {
    sourceNote +=
      " 국적 순위는 ODCLOUD_NATIONALITY_UDDI(15100020) 또는 ODCLOUD_STUDENT_NATIONALITY_UDDI(15100039) 활용신청 후 제공됩니다.";
  } else if (nationalitySource === "student_visa") {
    sourceNote +=
      " 국적·전월대비는 외국인 유학생 국적별 통계(15100039) 기준입니다.";
  } else {
    sourceNote +=
      " 국적·전월대비는 등록외국인 국적별 통계(15100020) 기준 참고 지표입니다.";
  }

  if (regionDetailAvailable && yearbookRegion) {
    sourceNote += ` 국가별 거주지역 1~5위는 ${yearbookRegion.sourceMessage}입니다.`;
  } else {
    sourceNote +=
      " 국가별 거주지역은 YEARBOOK_XLSX_DIR에 통계연보 엑셀(2장_Ⅱ_3)을 지정하면 표시됩니다.";
  }

  return {
    visaCode: visaItem.code,
    visaLabel: visaItem.label,
    year,
    month,
    dateKey,
    totalCount: visaItem.count,
    nationalityRanking,
    regionRanking,
    detailAvailable,
    nationalitySource,
    regionDetailAvailable,
    regionReferenceYear,
    sourceNote,
  };
}
