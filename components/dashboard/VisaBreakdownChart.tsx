"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/immigration/formatters";
import type { VisaBreakdownResponse } from "@/lib/immigration/types";

type VisaBreakdownChartProps = {
  year: number;
  month: number;
  onVisaClick?: (visa: "D-2" | "D-4") => void;
};

async function fetchVisaBreakdown(
  year: number,
  month: number
): Promise<VisaBreakdownResponse> {
  const res = await fetch(`/api/immigration/visa?year=${year}&month=${month}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "비자 데이터를 불러올 수 없습니다");
  return body;
}

function formatYAxis(v: number) {
  return v >= 100000 ? `${(v / 10000).toFixed(0)}만` : `${(v / 1000).toFixed(0)}K`;
}

export function VisaBreakdownChart({
  year,
  month,
  onVisaClick,
}: VisaBreakdownChartProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["visa-breakdown", year, month],
    queryFn: () => fetchVisaBreakdown(year, month),
    staleTime: 60 * 60 * 1000,
  });

  const focusData =
    data?.focus.map((item) => ({
      name: item.code,
      fullLabel: item.label,
      count: item.count,
      clickable: item.code === "D-2" || item.code === "D-4",
    })) ?? [];

  const referenceData =
    data?.reference.slice(0, 10).map((item) => ({
      name: item.code,
      fullLabel: item.label,
      count: item.count,
    })) ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            D-2 / D-4 체류자격 ({year}년 {month}월)
          </CardTitle>
          <p className="text-xs text-slate-500">막대 클릭 시 국적·지역 상세</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-16 text-center text-sm text-slate-400">불러오는 중...</p>
          ) : isError || !focusData.length ? (
            <p className="py-16 text-center text-sm text-slate-400">데이터 없음</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={focusData}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={48}
                  tick={{ fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip
                  formatter={(value: number) => [`${formatNumber(value)}명`, "인원"]}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullLabel ?? ""
                  }
                />
                <Bar
                  dataKey="count"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(entry) => {
                    const code = entry?.name as string;
                    if (code === "D-2" || code === "D-4") {
                      onVisaClick?.(code);
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            기타 체류자격 참고 지표 ({year}년 {month}월)
          </CardTitle>
          <p className="text-xs text-slate-500">D-2/D-4 제외 상위 10개 비자</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-16 text-center text-sm text-slate-400">불러오는 중...</p>
          ) : isError || !referenceData.length ? (
            <p className="py-16 text-center text-sm text-slate-400">데이터 없음</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={referenceData} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-35}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`${formatNumber(value)}명`, "인원"]}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullLabel ?? ""
                  }
                />
                <Bar dataKey="count" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
