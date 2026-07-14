"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardPeriodHeader } from "@/components/dashboard/DashboardPeriodHeader";
import { RankingBarChart } from "@/components/dashboard/RankingBarChart";
import { formatNumber } from "@/lib/immigration/formatters";
import type { GlobalImmigrationResponse } from "@/lib/immigration/types";

const TREND_COLORS = ["#2563eb", "#14b8a6", "#f472b6", "#8b5cf6", "#f59e0b"];

async function fetchGlobal(year: number): Promise<GlobalImmigrationResponse> {
  const res = await fetch(`/api/immigration/global?year=${year}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "데이터를 불러올 수 없습니다");
  return body;
}

export function GlobalDashboard() {
  const [year, setYear] = useState(2024);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["global-immigration", year],
    queryFn: () => fetchGlobal(year),
    staleTime: 24 * 60 * 60 * 1000,
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
        UN 국제이민자 데이터를 불러오는 중...
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

  const trendCountries = data.topCountries.slice(0, 5).map((item) => item.name);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <DashboardPeriodHeader
        subtitle="UN DESA · World Bank Open Data"
        title="세계 이민자 현황 — 국가별 국제이민자"
        periodLabel={`${data.year}년 기준 · 총 ${formatNumber(data.totalCount)}명`}
        year={year}
        month={1}
        availableYears={data.availableYears}
        sourceMessage={data.sourceMessage}
        onYearChange={setYear}
        onMonthChange={() => {}}
        showMonth={false}
        dataSourceLabel="UN / World Bank"
      />

      <main className="space-y-5 p-4 md:p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <RankingBarChart
            title="국가별 국제이민자 순위"
            description={`${data.year}년 상위 15개국`}
            data={data.topCountries}
            color="#2563eb"
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">상위 5개국 연도별 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data.yearlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) =>
                      v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : String(v)
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(v: number) => `${formatNumber(v)}명`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {trendCountries.map((country, index) => (
                    <Line
                      key={country}
                      type="monotone"
                      dataKey={country}
                      name={country}
                      stroke={TREND_COLORS[index % TREND_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">국가별 국제이민자 전체 목록</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">순위</th>
                  <th className="px-3 py-2">국가</th>
                  <th className="px-3 py-2 text-right">이민자 수</th>
                  <th className="px-3 py-2 text-right">비율</th>
                </tr>
              </thead>
              <tbody>
                {data.ranking.map((item, index) => (
                  <tr key={item.name} className="border-t">
                    <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                    <td className="px-3 py-2 font-medium">{item.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(item.count)}명
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                      {((item.count / data.totalCount) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
