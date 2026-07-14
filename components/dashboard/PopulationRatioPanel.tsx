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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber, formatSharePercent } from "@/lib/immigration/formatters";
import type { PopulationRatioTrendResponse } from "@/lib/immigration/types";

type PopulationRatioPanelProps = {
  year: number;
};

async function fetchPopulationRatio(
  view: "monthly" | "yearly",
  year: number
): Promise<PopulationRatioTrendResponse> {
  const params = new URLSearchParams({
    view,
    year: String(year),
    startYear: String(year - 5),
    endYear: String(year),
  });
  const res = await fetch(`/api/immigration/population-ratio?${params}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "인구 비율 조회 실패");
  return body;
}

export function PopulationRatioPanel({ year }: PopulationRatioPanelProps) {
  const [view, setView] = useState<"monthly" | "yearly">("monthly");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["population-ratio", view, year],
    queryFn: () => fetchPopulationRatio(view, year),
    staleTime: 60 * 60 * 1000,
  });

  const latest = data?.points[data.points.length - 1];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">주민등록인구 대비 외국인 비율</CardTitle>
            <p className="text-xs text-slate-500">
              통계청 KOSIS 주민등록인구 + 장기체류외국인 (단기 제외)
            </p>
          </div>
          <Select value={view} onValueChange={(v) => setView(v as "monthly" | "yearly")}>
            <SelectTrigger className="h-8 w-[110px] bg-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">월별</SelectItem>
              <SelectItem value="yearly">연간</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-12 text-center text-sm text-slate-400">인구 비율 계산 중...</p>
        ) : isError || !data?.points.length ? (
          <div className="rounded-lg border border-dashed bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            <p>KOSIS 주민등록인구 데이터를 불러오지 못했습니다.</p>
            <p className="mt-1 text-xs">
              {data?.sourceMessage?.includes("미설정")
                ? "`.env.local`에 `KOSIS_API_KEY`를 설정한 뒤 개발 서버를 재시작하세요."
                : "KOSIS API 응답이 비어 있습니다. 서버 로그를 확인하거나 잠시 후 다시 시도하세요."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {latest && (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">주민등록인구</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatNumber(latest.residentPopulation)}명
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">등록외국인</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatNumber(latest.foreignerPopulation)}명
                  </p>
                </div>
                <div className="rounded-md bg-blue-50 px-3 py-2">
                  <p className="text-[11px] text-blue-700">외국인 비율</p>
                  <p className="text-lg font-semibold tabular-nums text-blue-800">
                    {formatSharePercent(latest.foreignerSharePercent)}
                  </p>
                </div>
              </div>
            )}

            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "외국인 비율") return [`${value.toFixed(2)}%`, name];
                    return [`${formatNumber(value)}명`, name];
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="residentPopulation"
                  name="주민등록인구"
                  stroke="#64748b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="foreignerPopulation"
                  name="등록외국인"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="foreignerSharePercent"
                  name="외국인 비율"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>

            <p className="text-[11px] text-slate-400">{data.sourceMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
