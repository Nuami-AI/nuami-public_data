"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Database } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SummaryHero } from "@/components/dashboard/SummaryHero";
import { RegionMapPanel } from "@/components/dashboard/RegionMapPanel";
import { VisaBreakdownChart } from "@/components/dashboard/VisaBreakdownChart";
import { VisaDetailSheet } from "@/components/dashboard/VisaDetailSheet";
import { ChartPanel } from "@/components/dashboard/ChartPanel";
import { ImmigrationTable } from "@/components/dashboard/ImmigrationTable";
import { PopulationRatioPanel } from "@/components/dashboard/PopulationRatioPanel";
import {
  filterByYearMonth,
  getStatForPeriod,
} from "@/lib/immigration/transform";
import type { ImmigrationApiResponse } from "@/lib/immigration/types";
import { formatYearMonth } from "@/lib/immigration/formatters";

async function fetchImmigrationData(): Promise<ImmigrationApiResponse> {
  const res = await fetch("/api/immigration");
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? "데이터를 불러올 수 없습니다");
  }
  return body;
}

export default function ImmigrationDashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["immigration"],
    queryFn: fetchImmigrationData,
    staleTime: 60 * 60 * 1000,
  });

  const latestPeriod = useMemo(() => {
    if (!data?.stats.length) return null;
    const last = data.stats[data.stats.length - 1];
    return { year: last.year, month: last.month };
  }, [data]);

  const [year, setYear] = useState<number | "all">("all");
  const [month, setMonth] = useState<number | "all">("all");
  const [selectedVisa, setSelectedVisa] = useState<"D-2" | "D-4" | null>(null);

  useEffect(() => {
    if (latestPeriod) {
      setYear(latestPeriod.year);
      setMonth(latestPeriod.month);
    }
  }, [latestPeriod]);

  const availableYears = data?.availableYears ?? [];

  const currentStat = useMemo(() => {
    if (!data?.stats || !latestPeriod) return undefined;
    const y = year === "all" ? latestPeriod.year : year;
    const m = month === "all" ? latestPeriod.month : month;
    return getStatForPeriod(data.stats, y, m);
  }, [data, year, month, latestPeriod]);

  const chartYear =
    year === "all"
      ? latestPeriod?.year ?? availableYears[availableYears.length - 1] ?? 2000
      : year;

  const detailYear = year === "all" ? (latestPeriod?.year ?? 2026) : year;
  const detailMonth = month === "all" ? (latestPeriod?.month ?? 5) : month;

  const filteredTableData = useMemo(() => {
    if (!data?.stats) return [];
    return filterByYearMonth(data.stats, year, month);
  }, [data, year, month]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-500">공공데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-6 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <div>
          <p className="font-medium text-slate-800">공공데이터 API 연결 필요</p>
          <p className="mt-2 text-sm text-slate-600">
            {error instanceof Error ? error.message : "데이터를 불러올 수 없습니다"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-slate-500">
                출입국·외국인정책본부 통계월보
              </p>
              <h1 className="text-lg font-bold text-slate-900 md:text-xl">
                체류외국인 (단기+장기 체류외국인)
              </h1>
              {currentStat && (
                <p className="text-xs text-slate-500">
                  {formatYearMonth(currentStat.dateKey)} 기준
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(year)}
                onValueChange={(v) => setYear(v === "all" ? "all" : parseInt(v, 10))}
              >
                <SelectTrigger className="h-9 w-[100px] bg-white">
                  <SelectValue placeholder="연도" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(month)}
                onValueChange={(v) => setMonth(v === "all" ? "all" : parseInt(v, 10))}
              >
                <SelectTrigger className="h-9 w-[80px] bg-white">
                  <SelectValue placeholder="월" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {String(m).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="hidden items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-[11px] text-slate-600 sm:flex">
                <Database className="h-3.5 w-3.5" />
                공공데이터 API
              </div>
            </div>
          </div>
          {data.sourceMessage && (
            <p className="mt-1 text-[11px] text-slate-400">{data.sourceMessage}</p>
          )}
        </header>

        <main className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
          {currentStat ? (
            <>
              <SummaryHero
                stat={currentStat}
                onVisaClick={(visa) => setSelectedVisa(visa)}
              />

              <div className="grid gap-4 xl:grid-cols-5">
                <div className="xl:col-span-2">
                  <RegionMapPanel year={detailYear} month={detailMonth} />
                </div>
                <div className="xl:col-span-3">
                  <ChartPanel
                    stats={data.stats}
                    yearlySummaries={data.yearlySummaries}
                    selectedYear={chartYear}
                    selectedMetric="all"
                    periodView="monthly"
                    compact
                  />
                </div>
              </div>

              <VisaBreakdownChart
                year={detailYear}
                month={detailMonth}
                onVisaClick={(visa) => setSelectedVisa(visa)}
              />

              <PopulationRatioPanel year={chartYear} />
            </>
          ) : (
            <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
              선택한 기간의 데이터가 없습니다.
            </div>
          )}

          <section aria-label="상세 데이터 테이블">
            <ImmigrationTable
              data={filteredTableData.length > 0 ? filteredTableData : data.stats}
            />
          </section>
        </main>
      </div>

      <VisaDetailSheet
        visa={selectedVisa}
        year={detailYear}
        month={detailMonth}
        onClose={() => setSelectedVisa(null)}
      />
    </>
  );
}
