"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardPeriodHeader } from "@/components/dashboard/DashboardPeriodHeader";
import { RankingBarChart } from "@/components/dashboard/RankingBarChart";
import { formatNumber, formatYearMonth } from "@/lib/immigration/formatters";
import type { DomesticImmigrationResponse } from "@/lib/immigration/types";

type DomesticDashboardProps = {
  detail?: boolean;
};

async function fetchDomestic(
  year: number,
  month: number,
  options?: { sido?: string; level?: "sido" | "sigungu" }
): Promise<DomesticImmigrationResponse> {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
    level: options?.level ?? "sido",
  });
  if (options?.sido) params.set("sido", options.sido);

  const res = await fetch(`/api/immigration/domestic?${params}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "데이터를 불러올 수 없습니다");
  return body;
}

export function DomesticDashboard({ detail = false }: DomesticDashboardProps) {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5);
  const [sido, setSido] = useState<string>("all");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["domestic-immigration", year, month, sido, detail],
    queryFn: () =>
      fetchDomestic(year, month, {
        level: detail ? "sigungu" : "sido",
        sido: sido !== "all" ? sido : undefined,
      }),
    staleTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (data?.availableYears.length) {
      const latestYear = data.availableYears[data.availableYears.length - 1];
      if (!data.availableYears.includes(year)) {
        setYear(latestYear);
      }
    }
  }, [data, year]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
        지역별 데이터를 불러오는 중...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="font-medium text-slate-800">데이터를 불러올 수 없습니다</p>
        <p className="text-sm text-slate-600">
          {error instanceof Error ? error.message : "API 오류"}
        </p>
      </div>
    );
  }

  const sidoFilter = detail ? (
    <Select value={sido} onValueChange={setSido}>
      <SelectTrigger className="h-9 w-[140px] bg-white">
        <SelectValue placeholder="시·도" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체 시·도</SelectItem>
        {data.availableSido.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <DashboardPeriodHeader
        subtitle="출입국·외국인정책본부 통계월보"
        title={
          detail
            ? "국내 이민자 현황 — 세부 지역 현황"
            : "국내 이민자 현황 — 지역별 인구·체류자"
        }
        periodLabel={`${formatYearMonth(data.dateKey)} 기준 · ${data.metricLabel} ${formatNumber(data.totalCount)}명`}
        year={year}
        month={month}
        availableYears={data.availableYears}
        sourceMessage={data.sourceMessage}
        onYearChange={setYear}
        onMonthChange={setMonth}
        extra={sidoFilter}
      />

      <main className="space-y-5 p-4 md:p-6">
        {data.metricScope === "registered" && data.metricNote && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {data.metricNote}
          </p>
        )}
        {!detail && (
          <RankingBarChart
            title="시·도별 장기체류외국인"
            description="단기체류 제외 · 등록+거소 기준"
            data={data.sidoRanking}
            color="#8b5cf6"
            layout="horizontal"
            height={340}
          />
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {detail && (
            <RankingBarChart
              title={sido !== "all" ? `${sido} 시군구별` : "시군구별 상위"}
              description={data.metricNote ?? "장기체류외국인 거주 시군구 순위"}
              data={data.sigunguRanking}
              color="#14b8a6"
            />
          )}

          <Card className={detail ? "" : "lg:col-span-2"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {detail ? "시군구별 상세 목록" : "시군구별 상위 20"}
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2">순위</th>
                    <th className="px-3 py-2">시·도</th>
                    <th className="px-3 py-2">시군구</th>
                    <th className="px-3 py-2 text-right">인원</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sigunguRanking.map((item, index) => (
                    <tr key={`${item.sido}-${item.name}`} className="border-t">
                      <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                      <td className="px-3 py-2">{item.sido}</td>
                      <td className="px-3 py-2 font-medium">{item.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatNumber(item.count)}명
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
