"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronRight, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RankingBarChart } from "@/components/dashboard/RankingBarChart";
import { formatNumber } from "@/lib/immigration/formatters";
import type {
  SidoNationalityDistrictRow,
  SidoNationalityOverviewResponse,
} from "@/lib/immigration/types";
import { cn } from "@/lib/utils";

const DEFAULT_SIDO = "부산광역시";
const DEFAULT_NATIONALITY = "베트남";

const SIDO_SAMPLES = [
  "부산광역시",
  "경기도",
  "서울특별시",
  "인천광역시",
  "경상남도",
  "충청남도",
];

const NATIONALITY_SAMPLES = ["베트남", "중국", "우즈베키스탄", "태국", "필리핀", "네팔"];

async function fetchSidoNationality(
  sido: string,
  nationality: string
): Promise<SidoNationalityOverviewResponse> {
  const params = new URLSearchParams({ sido, nationality });
  const res = await fetch(`/api/immigration/sido-nationality?${params}`);
  const body = await res.json();
  if (!res.ok && !body.districts?.length) {
    throw new Error(body.error ?? "데이터를 불러올 수 없습니다");
  }
  return body;
}

function DistrictDetailPanel({
  district,
  nationality,
}: {
  district: SidoNationalityDistrictRow;
  nationality: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-violet-50 px-4 py-3">
        <p className="text-lg font-bold text-violet-900">{district.label}</p>
        <p className="mt-1 text-sm text-violet-800">
          {nationality} 등록외국인{" "}
          <span className="font-semibold">{formatNumber(district.nationalityCount)}</span>명
          {district.nationalitySharePercent !== null && (
            <span className="text-violet-600">
              {" "}
              · 시·도 내 {district.nationalitySharePercent.toFixed(1)}%
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-violet-600">
          해당 구 전체 등록외국인 {formatNumber(district.totalForeigners)}명
        </p>
      </div>

      <RankingBarChart
        title="체류자격별 순위 (해당 구 전체)"
        description="국적 구분 없는 전체 외국인 기준 · 참고용"
        data={district.visaRanking}
        color="#8b5cf6"
        maxItems={12}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">체류자격 전체 목록</CardTitle>
        </CardHeader>
        <CardContent className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs text-slate-500">
              <tr>
                <th className="px-2 py-1.5">순위</th>
                <th className="px-2 py-1.5">체류자격</th>
                <th className="px-2 py-1.5 text-right">인원</th>
              </tr>
            </thead>
            <tbody>
              {district.visaRanking.map((item, index) => (
                <tr key={item.name} className="border-t">
                  <td className="px-2 py-1.5 text-slate-500">{index + 1}</td>
                  <td className="px-2 py-1.5 font-medium">{item.name}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatNumber(item.count)}명
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Link
        href={`/dashboard/domestic/region?q=${encodeURIComponent(district.sigungu)}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        이 지역 상세 보기
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function SidoNationalityDashboard() {
  const [sidoInput, setSidoInput] = useState(DEFAULT_SIDO);
  const [nationalityInput, setNationalityInput] = useState(DEFAULT_NATIONALITY);
  const [sido, setSido] = useState(DEFAULT_SIDO);
  const [nationality, setNationality] = useState(DEFAULT_NATIONALITY);
  const [selectedSigungu, setSelectedSigungu] = useState<string | null>(null);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["sido-nationality", sido, nationality],
    queryFn: () => fetchSidoNationality(sido, nationality),
    enabled: sido.length > 0 && nationality.length > 0,
    staleTime: 60 * 60 * 1000,
  });

  const selectedDistrict = useMemo(
    () => data?.districts.find((item) => item.sigungu === selectedSigungu) ?? null,
    [data?.districts, selectedSigungu]
  );

  const chartData = useMemo(
    () =>
      (data?.districts ?? []).map((item) => ({
        name: item.sigungu,
        count: item.nationalityCount,
      })),
    [data?.districts]
  );

  const handleSearch = () => {
    const nextSido = sidoInput.trim();
    const nextNationality = nationalityInput.trim();
    if (!nextSido || !nextNationality) return;
    setSido(nextSido);
    setNationality(nextNationality);
    setSelectedSigungu(null);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
        <p className="text-[11px] font-medium text-slate-500">법무부 통계연보 · 시·도별 국적</p>
        <h1 className="text-lg font-bold text-slate-900 md:text-xl">
          시·도 내 지역별 국적·비자 현황
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          예: 부산 각 구·군에 거주하는 베트남인 인원과, 해당 지역 전체 체류자격 분포를 함께
          확인합니다.
        </p>

        <form
          className="mt-4 grid max-w-3xl gap-3 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
        >
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">시·도</label>
            <Input
              value={sidoInput}
              onChange={(e) => setSidoInput(e.target.value)}
              placeholder="예: 부산광역시"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">국적(지역)</label>
            <Input
              value={nationalityInput}
              onChange={(e) => setNationalityInput(e.target.value)}
              placeholder="예: 베트남"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-md bg-[#1a2f4a] px-4 py-2 text-sm font-medium text-white hover:bg-[#243a5c] md:w-auto"
            >
              조회
            </button>
          </div>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {SIDO_SAMPLES.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setSidoInput(sample);
                setSido(sample);
                setSelectedSigungu(null);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs text-slate-600 hover:bg-slate-100",
                sido === sample && "border-blue-300 bg-blue-50 text-blue-700"
              )}
            >
              {sample}
            </button>
          ))}
        </div>

        {data?.sourceMessage && (
          <p className="mt-2 text-[11px] text-slate-400">{data.sourceMessage}</p>
        )}
      </header>

      <main className="space-y-5 p-4 md:p-6">
        {isLoading || isFetching ? (
          <p className="py-16 text-center text-slate-500">데이터를 불러오는 중...</p>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : "조회 오류"}
            </p>
          </div>
        ) : data?.error && !data.districts.length ? (
          <div className="rounded-lg border border-dashed bg-slate-50 px-6 py-16 text-center text-sm text-slate-500">
            {data.error}
          </div>
        ) : data ? (
          <>
            <div className="rounded-lg border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">데이터 안내</p>
              <p className="mt-1 text-xs text-amber-800">{data.visaScopeNote}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <MapPin className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-xs text-slate-500">{data.sido}</p>
                    <p className="text-xl font-bold text-slate-900">
                      {formatNumber(data.sidoNationalityTotal)}명
                    </p>
                    <p className="text-xs text-slate-500">{data.nationality} 등록외국인 합계</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">집계 지역 수</p>
                  <p className="text-xl font-bold text-slate-900">{data.districts.length}개</p>
                  <p className="text-xs text-slate-500">시·군·구</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">1위 지역</p>
                  <p className="text-xl font-bold text-slate-900">
                    {data.districts[0]?.sigungu ?? "-"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {data.districts[0]
                      ? `${formatNumber(data.districts[0].nationalityCount)}명`
                      : "-"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <RankingBarChart
              title={`${data.sido} 시·군·구별 ${data.nationality} 인원`}
              description={`${data.dataYear}년 연말 등록외국인 기준`}
              data={chartData}
              color="#f472b6"
              maxItems={20}
              height={360}
            />

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">지역별 상세</CardTitle>
                  <p className="text-xs text-slate-500">
                    행을 클릭하면 해당 구·군의 체류자격 분포를 볼 수 있습니다.
                  </p>
                </CardHeader>
                <CardContent className="max-h-[520px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white text-left text-xs text-slate-500">
                      <tr>
                        <th className="px-2 py-1.5">순위</th>
                        <th className="px-2 py-1.5">시·군·구</th>
                        <th className="px-2 py-1.5 text-right">{data.nationality}</th>
                        <th className="px-2 py-1.5">1위 비자(전체)</th>
                        <th className="px-2 py-1.5 text-right">비자 인원</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.districts.map((item, index) => (
                        <tr
                          key={item.sigungu}
                          className={cn(
                            "cursor-pointer border-t hover:bg-slate-50",
                            selectedSigungu === item.sigungu && "bg-blue-50"
                          )}
                          onClick={() => setSelectedSigungu(item.sigungu)}
                        >
                          <td className="px-2 py-2 text-slate-500">{index + 1}</td>
                          <td className="px-2 py-2 font-medium">{item.sigungu}</td>
                          <td className="px-2 py-2 text-right tabular-nums">
                            {formatNumber(item.nationalityCount)}명
                          </td>
                          <td className="px-2 py-2 text-slate-700">
                            {item.topVisa?.name ?? "-"}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                            {item.topVisa ? `${formatNumber(item.topVisa.count)}명` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <div>
                {selectedDistrict ? (
                  <DistrictDetailPanel
                    district={selectedDistrict}
                    nationality={data.nationality}
                  />
                ) : (
                  <Card className="h-full">
                    <CardContent className="flex h-full min-h-[320px] items-center justify-center px-6 py-10 text-center text-sm text-slate-500">
                      왼쪽 표에서 지역을 선택하면
                      <br />
                      체류자격 상세가 표시됩니다.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {data.topNationalities.length > 0 && (
              <RankingBarChart
                title={`${data.sido} 주요 국적(지역) 순위`}
                description="같은 시·도 내 다른 국적과 비교"
                data={data.topNationalities}
                color="#3b82f6"
                maxItems={12}
              />
            )}

            <div className="flex flex-wrap gap-2">
              {NATIONALITY_SAMPLES.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setNationalityInput(sample);
                    setNationality(sample);
                    setSelectedSigungu(null);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs text-slate-600 hover:bg-slate-100",
                    nationality === sample && "border-pink-300 bg-pink-50 text-pink-700"
                  )}
                >
                  {sample}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
