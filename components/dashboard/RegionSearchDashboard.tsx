"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RankingBarChart } from "@/components/dashboard/RankingBarChart";
import { formatNumber } from "@/lib/immigration/formatters";
import type { RegionSearchMatch, RegionSearchResponse, UniversityInRegion } from "@/lib/immigration/types";
import { cn } from "@/lib/utils";

async function fetchRegionSearch(query: string): Promise<RegionSearchResponse> {
  const res = await fetch(`/api/immigration/region-search?q=${encodeURIComponent(query)}`);
  const body = await res.json();
  if (!res.ok && !body.matches?.length) {
    throw new Error(body.error ?? "검색에 실패했습니다");
  }
  return body;
}

function UniversityList({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: UniversityInRegion[];
}) {
  if (!items.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((university) => (
          <div key={`${university.name}-${university.address}`} className="rounded-lg border px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-900">{university.name}</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                {university.schoolType}
              </span>
              {university.isCyber && (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-700">
                  사이버대학
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">{university.address}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              {university.establishment}
              {university.campusType !== "본교" ? ` · ${university.campusType}` : ""}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StudentVisaUniversityPanel({
  context,
  regionLabel,
}: {
  context: NonNullable<RegionSearchMatch["studentContext"]>;
  regionLabel: string;
}) {
  const hasStudentVisa = context.d2Count > 0 || context.d4Count > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-3">
        <p className="text-sm font-semibold text-indigo-900">D-2/D-4 유학·연수와 지역 대학</p>
        <p className="mt-1 text-xs text-indigo-700">
          {regionLabel}에 거주하는 유학·연수 체류자와 해당 지역(및 인근) 대학 정보를 함께
          보여줍니다. 통계상 인원이 많은 지역은 대학 인근 거주가 한 요인일 수 있습니다.
        </p>
        {hasStudentVisa && (
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {context.d2Count > 0 && (
              <span className="rounded-md bg-white px-3 py-1.5 font-medium text-indigo-900">
                D-2 유학 {formatNumber(context.d2Count)}명
              </span>
            )}
            {context.d4Count > 0 && (
              <span className="rounded-md bg-white px-3 py-1.5 font-medium text-indigo-900">
                D-4 일반연수 {formatNumber(context.d4Count)}명
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <UniversityList
          title="이 지역 소재 대학·전문대학"
          description="공공데이터 기준 해당 시·군·구 주소를 가진 교육기관"
          items={context.universitiesInRegion}
        />
        <UniversityList
          title="같은 시·도 내 인근 대학"
          description="인접 구·시에 위치한 대학 (통학·거주 범위 참고)"
          items={context.nearbyUniversities}
        />
      </div>

      {context.universitiesInRegion.length === 0 && context.nearbyUniversities.length === 0 && (
        <div className="rounded-lg border border-dashed bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          이 지역에 등록된 대학·전문대학 주소가 없습니다. D-2/D-4 체류자는 인근 지역 통학·거주
          가능성을 함께 참고해 주세요.
        </div>
      )}

      <p className="text-[11px] text-slate-400">{context.universitySourceMessage}</p>
    </div>
  );
}

function RegionResultPanel({ region }: { region: RegionSearchMatch }) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-blue-50 px-4 py-3">
        <p className="text-lg font-bold text-blue-900">{region.label}</p>
        <p className="text-sm text-blue-700">
          등록외국인 <span className="font-semibold">{formatNumber(region.totalCount)}</span>명
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankingBarChart
          title="체류자격별 순위"
          description="상위 15개 비자"
          data={region.visaRanking}
          color="#8b5cf6"
          maxItems={15}
        />
        <RankingBarChart
          title="국적(지역)별 순위"
          description="상위 15개 국가·지역"
          data={region.nationalityRanking}
          color="#f472b6"
          maxItems={15}
        />
      </div>

      {region.studentContext && (
        <StudentVisaUniversityPanel
          context={region.studentContext}
          regionLabel={region.label}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">체류자격별 전체 목록</CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">순위</th>
                  <th className="px-2 py-1.5">체류자격</th>
                  <th className="px-2 py-1.5 text-right">인원</th>
                </tr>
              </thead>
              <tbody>
                {region.visaRanking.map((item, index) => (
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">국적(지역)별 전체 목록</CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">순위</th>
                  <th className="px-2 py-1.5">국적(지역)</th>
                  <th className="px-2 py-1.5 text-right">인원</th>
                </tr>
              </thead>
              <tbody>
                {region.nationalityRanking.map((item, index) => (
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
      </div>
    </div>
  );
}

export function RegionSearchDashboard() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("해운대구");
  const [selected, setSelected] = useState<RegionSearchMatch | null>(null);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["region-search", query],
    queryFn: () => fetchRegionSearch(query),
    enabled: query.length > 0,
    staleTime: 60 * 60 * 1000,
  });

  const activeRegion = selected ?? data?.result ?? null;

  const handleSearch = (value?: string) => {
    const next = (value ?? input).trim();
    if (!next) return;
    setQuery(next);
    setSelected(null);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
        <p className="text-[11px] font-medium text-slate-500">법무부 통계연보 · 지역 검색</p>
        <h1 className="text-lg font-bold text-slate-900 md:text-xl">
          지역별 외국인 — 비자·국적 현황
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          시·군·구를 검색하면 체류자격·국적 순위와 함께 D-2/D-4 유학·연수 인원, 지역 소재 대학
          정보를 보여줍니다.
        </p>

        <form
          className="mt-4 flex max-w-xl gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="예: 해운대구, 안산시, 종로구"
              className="pl-9"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-[#1a2f4a] px-4 py-2 text-sm font-medium text-white hover:bg-[#243a5c]"
          >
            검색
          </button>
        </form>

        {data?.sourceMessage && (
          <p className="mt-2 text-[11px] text-slate-400">{data.sourceMessage}</p>
        )}
      </header>

      <main className="space-y-5 p-4 md:p-6">
        {isLoading || isFetching ? (
          <p className="py-16 text-center text-slate-500">지역 데이터를 검색하는 중...</p>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : "검색 오류"}
            </p>
          </div>
        ) : data?.error && !activeRegion ? (
          <div className="rounded-lg border border-dashed bg-slate-50 px-6 py-16 text-center text-sm text-slate-500">
            {data.error}
          </div>
        ) : activeRegion ? (
          <RegionResultPanel region={activeRegion} />
        ) : data && data.matches.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                &quot;{data.query}&quot; 검색 결과 ({data.matches.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-600">아래에서 지역을 선택하세요.</p>
              <ul className="divide-y rounded-lg border">
                {data.matches.map((match) => (
                  <li key={`${match.sido}-${match.sigungu}`}>
                    <button
                      type="button"
                      onClick={() => setSelected(match)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-900">{match.label}</span>
                      <span className="text-sm tabular-nums text-slate-500">
                        {formatNumber(match.totalCount)}명
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {!activeRegion && data?.matches.length === 0 && !data.error && (
          <div className="rounded-lg border border-dashed bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            시·군·구 이름을 입력하고 검색하세요.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {["해운대구", "종로구", "안산시", "수원시", "제주시"].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setInput(sample);
                handleSearch(sample);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs text-slate-600 hover:bg-slate-100",
                query === sample && "border-blue-300 bg-blue-50 text-blue-700"
              )}
            >
              {sample}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
