"use client";

import { useEffect, useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatComparison,
  formatNumber,
  formatYearMonth,
} from "@/lib/immigration/formatters";
import type { VisaDetailResponse } from "@/lib/immigration/types";
import { cn } from "@/lib/utils";

type VisaDetailSheetProps = {
  visa: "D-2" | "D-4" | null;
  year: number;
  month: number;
  onClose: () => void;
};

async function fetchVisaDetail(
  visa: string,
  year: number,
  month: number
): Promise<VisaDetailResponse> {
  const res = await fetch(
    `/api/immigration/detail?visa=${encodeURIComponent(visa)}&year=${year}&month=${month}`
  );
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "상세 데이터를 불러올 수 없습니다");
  return body;
}

function RankingChart({
  title,
  data,
  color,
}: {
  title: string;
  data: { name: string; count: number }[];
  color: string;
}) {
  if (!data.length) {
    return (
      <div className="rounded-lg border border-dashed bg-slate-50 p-6 text-center text-sm text-slate-500">
        {title} 데이터가 없습니다.
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    rank: index + 1,
    shortName: item.name.length > 8 ? `${item.name.slice(0, 8)}…` : item.name,
  }));

  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-slate-700">{title}</h4>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            type="number"
            tickFormatter={(v) => (v >= 10000 ? `${(v / 10000).toFixed(0)}만` : String(v))}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            width={72}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: number) => [`${formatNumber(value)}명`, "인원"]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""}
          />
          <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MomCell({ delta, rate }: { delta: number | null; rate: number | null }) {
  const formatted = formatComparison({ delta, rate });
  if (formatted.deltaText === "-") {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <span
      className={cn(
        "tabular-nums",
        formatted.direction === "up" && "text-red-600",
        formatted.direction === "down" && "text-blue-600",
        formatted.direction === "neutral" && "text-slate-500"
      )}
    >
      {formatted.deltaText}명
      <span className="ml-1 text-xs">({formatted.rateText})</span>
    </span>
  );
}

export function VisaDetailSheet({ visa, year, month, onClose }: VisaDetailSheetProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["visa-detail", visa, year, month],
    queryFn: () => fetchVisaDetail(visa!, year, month),
    enabled: visa !== null,
    staleTime: 30 * 60 * 1000,
  });

  if (!visa) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${visa} 상세`}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-xs text-slate-500">
              {formatYearMonth(`${year}-${String(month).padStart(2, "0")}`)}
            </p>
            <h2 className="text-lg font-bold text-slate-900">
              {visa} 체류자격 상세
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {isLoading ? (
            <p className="py-20 text-center text-slate-500">상세 데이터를 불러오는 중...</p>
          ) : isError ? (
            <p className="py-20 text-center text-red-500">
              {error instanceof Error ? error.message : "오류가 발생했습니다"}
            </p>
          ) : data ? (
            <>
              <div className="mb-6 rounded-lg bg-blue-50 px-4 py-3">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">{data.visaLabel}</span> 총{" "}
                  <span className="text-lg font-bold">{formatNumber(data.totalCount)}</span>명
                </p>
                <p className="mt-1 text-xs text-blue-600/80">{data.sourceNote}</p>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <RankingChart
                  title="지역별 순위 (시·도)"
                  data={data.regionRanking}
                  color="#8b5cf6"
                />
                <RankingChart
                  title="국적(지역)별 순위"
                  data={data.nationalityRanking}
                  color="#f472b6"
                />
              </div>

              {data.detailAvailable && (
                <div className="mt-4 overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-slate-500">
                      <tr>
                        <th className="w-8 px-2 py-2" />
                        <th className="px-3 py-2">순위</th>
                        <th className="px-3 py-2">국적(지역)</th>
                        <th className="px-3 py-2 text-right">인원</th>
                        <th className="px-3 py-2 text-right">전월대비</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.nationalityRanking.map((item, index) => {
                        const isOpen = expanded === item.name;
                        return (
                          <Fragment key={item.name}>
                            <tr
                              key={item.name}
                              className="border-t hover:bg-slate-50/80"
                            >
                              <td className="px-2 py-2">
                                {item.topRegions.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpanded(isOpen ? null : item.name)
                                    }
                                    className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                    aria-label={`${item.name} 거주지역 펼치기`}
                                  >
                                    {isOpen ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                              <td className="px-3 py-2 font-medium">{item.name}</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {formatNumber(item.count)}명
                              </td>
                              <td className="px-3 py-2 text-right text-xs">
                                <MomCell
                                  delta={item.mom.delta}
                                  rate={item.mom.rate}
                                />
                              </td>
                            </tr>
                            {isOpen && item.topRegions.length > 0 && (
                              <tr key={`${item.name}-regions`} className="border-t bg-slate-50/60">
                                <td colSpan={5} className="px-4 py-3">
                                  <p className="mb-2 text-xs font-medium text-slate-600">
                                    {item.name} 거주지역 1~5위
                                  </p>
                                  <div className="grid gap-1 sm:grid-cols-2">
                                    {item.topRegions.map((region, regionIndex) => (
                                      <div
                                        key={region.name}
                                        className="flex items-center justify-between rounded-md bg-white px-3 py-1.5 text-xs"
                                      >
                                        <span className="text-slate-600">
                                          {regionIndex + 1}. {region.name}
                                        </span>
                                        <span className="font-medium tabular-nums text-slate-800">
                                          {formatNumber(region.count)}명
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                  {!data.regionDetailAvailable && (
                    <p className="border-t bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      국가별 거주지역은 .env.local에{" "}
                      <code className="rounded bg-amber-100 px-1">YEARBOOK_XLSX_DIR</code>로
                      통계연보 엑셀 폴더(2장_Ⅱ_3 파일 포함)를 지정하면 표시됩니다.
                    </p>
                  )}
                  {data.regionDetailAvailable && data.regionReferenceYear && (
                    <p className="border-t bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      거주지역 순위는 {data.regionReferenceYear}년 연말 통계연보 기준입니다.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
