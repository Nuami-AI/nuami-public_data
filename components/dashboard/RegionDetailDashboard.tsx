"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { AlertCircle, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DashboardPeriodHeader } from "@/components/dashboard/DashboardPeriodHeader";
import { RankingBarChart } from "@/components/dashboard/RankingBarChart";
import {
  formatNumber,
  formatSharePercent,
  formatYearMonth,
} from "@/lib/immigration/formatters";
import type { RegionDetailResponse } from "@/lib/immigration/types";

async function fetchRegionDetail(
  query: string,
  year: number,
  month: number
): Promise<RegionDetailResponse> {
  const params = new URLSearchParams({
    q: query,
    year: String(year),
    month: String(month),
  });
  const res = await fetch(`/api/immigration/region-detail?${params}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "지역 상세 조회 실패");
  return body;
}

function ShareTable({
  title,
  rows,
}: {
  title: string;
  rows: RegionDetailResponse["nationalityRanking"];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white text-left text-xs text-slate-500">
            <tr>
              <th className="px-2 py-1.5">순위</th>
              <th className="px-2 py-1.5">항목</th>
              <th className="px-2 py-1.5 text-right">인원</th>
              <th className="px-2 py-1.5 text-right">비율</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.name} className="border-t">
                <td className="px-2 py-1.5 text-slate-500">{index + 1}</td>
                <td className="px-2 py-1.5 font-medium">{row.name}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {formatNumber(row.count)}명
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-blue-700">
                  {formatSharePercent(row.sharePercent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function AgeGenderChart({ bands }: { bands: RegionDetailResponse["ageGenderBands"] }) {
  if (!bands.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">연령대·성별</CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center text-sm text-slate-400">
          통계연보 2장_Ⅱ_4 데이터가 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">연령대·성별</CardTitle>
        <p className="text-xs text-slate-500">통계연보 연말 기준 · 남/여 분해</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={bands} margin={{ left: 8, right: 16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="ageBand" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${formatNumber(v)}명`, ""]} />
            <Legend />
            <Line type="monotone" dataKey="male" name="남성" stroke="#6366f1" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="female" name="여성" stroke="#ec4899" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RegionDetailDashboard() {
  const [input, setInput] = useState("해운대구");
  const [query, setQuery] = useState("해운대구");
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(5);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["region-detail", query, year, month],
    queryFn: () => fetchRegionDetail(query, year, month),
    enabled: query.length > 0,
    staleTime: 60 * 60 * 1000,
  });

  const handleSearch = () => {
    const next = input.trim();
    if (!next) return;
    setQuery(next);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
        <p className="text-[11px] font-medium text-slate-500">법무부 통계 · 지역 통합 상세</p>
        <h1 className="text-lg font-bold text-slate-900 md:text-xl">
          지역별 체류외국인 (상세)
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          시·군·구를 검색하면 인원·국적·비자·연령·주민대비 외국인 비율을 한 화면에서 확인합니다.
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
      </header>

      {isLoading ? (
        <p className="py-16 text-center text-slate-500">지역 상세 데이터를 불러오는 중...</p>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-sm text-red-600">
            {error instanceof Error ? error.message : "조회 오류"}
          </p>
        </div>
      ) : data ? (
        <>
          <DashboardPeriodHeader
            subtitle={data.label}
            title="지역별 체류외국인 통합 현황"
            periodLabel={`${formatYearMonth(data.dateKey)} · 장기체류외국인 ${formatNumber(data.foreignerCount)}명`}
            year={year}
            month={month}
            availableYears={[2020, 2021, 2022, 2023, 2024, 2025, 2026]}
            sourceMessage={data.sourceMessage}
            onYearChange={setYear}
            onMonthChange={setMonth}
          />

          <main className="space-y-5 p-4 md:p-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border bg-white p-4">
                <p className="text-xs text-slate-500">지역 장기체류외국인</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatNumber(data.foreignerCount)}
                  <span className="ml-1 text-sm font-normal text-slate-500">명</span>
                </p>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <p className="text-xs text-slate-500">전국 대비</p>
                <p className="mt-1 text-2xl font-bold text-blue-700">
                  {formatSharePercent(data.nationalSharePercent)}
                </p>
                <p className="text-[11px] text-slate-400">
                  전국 {formatNumber(data.nationalForeignerCount)}명
                </p>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <p className="text-xs text-slate-500">주민등록인구 대비 외국인</p>
                <p className="mt-1 text-2xl font-bold text-indigo-700">
                  {data.populationRatio
                    ? formatSharePercent(data.populationRatio.foreignerSharePercent)
                    : "-"}
                </p>
                <p className="text-[11px] text-slate-400">
                  {data.populationRatio
                    ? `주민 ${formatNumber(data.populationRatio.residentPopulation)}명`
                    : "KOSIS_API_KEY 설정 필요"}
                </p>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <p className="text-xs text-slate-500">통계연보 기준</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {data.yearbookDataYear ? `${data.yearbookDataYear}년 연말` : "-"}
                </p>
                <p className="text-[11px] text-slate-400">국적·비자·연령 breakdown</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <RankingBarChart
                title="시·도별 분포"
                description="전국 대비 시·도 장기체류외국인"
                data={data.sidoRanking}
                color="#2563eb"
                layout="horizontal"
                height={300}
              />
              <RankingBarChart
                title="시군구별 상위"
                description="전국 상위 시·군·구"
                data={data.sigunguRanking}
                color="#14b8a6"
                height={300}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ShareTable title="국적(지역)별 순위" rows={data.nationalityRanking} />
              <ShareTable title="체류자격별 순위" rows={data.visaRanking} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <AgeGenderChart bands={data.ageGenderBands} />
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">연도별 장기체류외국인 추이</CardTitle>
                  <p className="text-xs text-slate-500">해당 시·군·구 · 12월 스냅샷</p>
                </CardHeader>
                <CardContent>
                  {data.yearlyForeignerTrend.length ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={data.yearlyForeignerTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [`${formatNumber(v)}명`, "장기체류외국인"]} />
                        <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="py-16 text-center text-sm text-slate-400">연도별 추이 데이터 없음</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {data.populationRatioTrend.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">월별 외국인 비율 추이</CardTitle>
                  <p className="text-xs text-slate-500">주민등록인구 대비 장기체류외국인 비율</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={data.populationRatioTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: number, name: string) => [
                          name === "foreignerSharePercent" ? `${v.toFixed(2)}%` : formatNumber(v),
                          name === "foreignerSharePercent" ? "외국인 비율" : name,
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="foreignerSharePercent"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </main>
        </>
      ) : null}
    </div>
  );
}
