"use client";

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
import type { RankingItem } from "@/lib/immigration/types";

type RankingBarChartProps = {
  title: string;
  description?: string;
  data: RankingItem[];
  color?: string;
  layout?: "vertical" | "horizontal";
  height?: number;
  maxItems?: number;
};

function formatYAxis(v: number) {
  return v >= 100000 ? `${(v / 10000).toFixed(0)}만` : `${(v / 1000).toFixed(0)}K`;
}

export function RankingBarChart({
  title,
  description,
  data,
  color = "#3b82f6",
  layout = "vertical",
  height = 320,
  maxItems = 15,
}: RankingBarChartProps) {
  const chartData = data.slice(0, maxItems).map((item) => ({
    ...item,
    shortName: item.name.length > 10 ? `${item.name.slice(0, 10)}…` : item.name,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">데이터 없음</p>
        ) : layout === "vertical" ? (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="shortName"
                width={80}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value: number) => [`${formatNumber(value)}명`, "인원"]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""}
              />
              <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} margin={{ bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="shortName"
                tick={{ fontSize: 10 }}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number) => [`${formatNumber(value)}명`, "인원"]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""}
              />
              <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
