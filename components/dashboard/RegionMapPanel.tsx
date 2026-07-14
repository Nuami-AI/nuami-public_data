"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/immigration/formatters";
import type { DomesticImmigrationResponse } from "@/lib/immigration/types";

type RegionMapPanelProps = {
  year: number;
  month: number;
};

async function fetchRegionData(
  year: number,
  month: number
): Promise<DomesticImmigrationResponse["sidoRanking"]> {
  const res = await fetch(`/api/immigration/domestic?year=${year}&month=${month}`);
  const body = await res.json();
  if (!res.ok) return [];
  return body.sidoRanking ?? [];
}

const REGION_COLORS = [
  "#1e3a5f",
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#93c5fd",
  "#bfdbfe",
];

export function RegionMapPanel({ year, month }: RegionMapPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["region-panel", year, month],
    queryFn: () => fetchRegionData(year, month),
    staleTime: 60 * 60 * 1000,
  });

  const chartData = (data ?? []).slice(0, 17).map((item, index) => ({
    ...item,
    fill: REGION_COLORS[Math.min(index, REGION_COLORS.length - 1)],
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          국내 장기체류외국인 거주지역 ({year}년 {month}월)
        </CardTitle>
        <p className="text-xs text-slate-500">
          단기체류 제외 · 시·도별 분포
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-slate-400">
            지역 데이터 불러오는 중...
          </div>
        ) : !chartData.length ? (
          <div className="flex h-[320px] flex-col items-center justify-center gap-2 text-center text-sm text-slate-400">
            <p>지역 데이터가 없습니다.</p>
            <p className="text-xs">
              ODCLOUD_REGION_UDDI(15100022) 및 ODCLOUD_RESIDENCE_REGION_UDDI(15155792) 활용신청 후
              이용 가능
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                angle={-40}
                textAnchor="end"
                height={70}
              />
              <YAxis
                tickFormatter={(v) =>
                  v >= 100000 ? `${(v / 10000).toFixed(0)}만` : String(v)
                }
                tick={{ fontSize: 11 }}
              />
              <Tooltip formatter={(v: number) => [`${formatNumber(v)}명`, "인원"]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
