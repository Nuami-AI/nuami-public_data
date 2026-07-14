"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
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
  formatNumber,
  formatPercent,
  formatDelta,
  formatMonthLabel,
} from "@/lib/immigration/formatters";
import {
  METRIC_COLORS,
  METRIC_LABELS,
  type MetricKey,
  type PeriodView,
  type StatWithComparisons,
  type YearlySummary,
} from "@/lib/immigration/types";

type ChartPanelProps = {
  stats: StatWithComparisons[];
  yearlySummaries: YearlySummary[];
  selectedYear: number;
  selectedMetric: MetricKey | "all";
  periodView: PeriodView;
  compact?: boolean;
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border bg-white p-3 text-sm shadow-lg">
      <p className="mb-1 font-medium text-slate-700">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatNumber(entry.value)}명
        </p>
      ))}
    </div>
  );
}

function D2D4Tooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: Record<string, unknown>;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border bg-white p-3 text-sm shadow-lg">
      <p className="mb-2 font-medium text-slate-700">{label}</p>
      {payload.map((entry) => {
        const momDelta = entry.payload[`${entry.name}_momDelta`] as number | null;
        const momRate = entry.payload[`${entry.name}_momRate`] as number | null;
        const yoyDelta = entry.payload[`${entry.name}_yoyDelta`] as number | null;
        const yoyRate = entry.payload[`${entry.name}_yoyRate`] as number | null;

        return (
          <div key={entry.name} className="mb-1">
            <p style={{ color: entry.color }} className="font-medium">
              {entry.name}: {formatNumber(entry.value)}명
            </p>
            <p className="text-xs text-slate-500">
              전월: {formatDelta(momDelta)} ({formatPercent(momRate)})
            </p>
            <p className="text-xs text-slate-500">
              전년: {formatDelta(yoyDelta)} ({formatPercent(yoyRate)})
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function ChartPanel({
  stats,
  yearlySummaries,
  selectedYear,
  selectedMetric,
  periodView,
  compact = false,
}: ChartPanelProps) {
  const yearStats = useMemo(
    () => stats.filter((s) => s.year === selectedYear).sort((a, b) => a.month - b.month),
    [stats, selectedYear]
  );

  const monthlyChartData = useMemo(
    () =>
      yearStats.map((s) => ({
        label: formatMonthLabel(s.month),
        total: s.totalForeigners,
        shortTerm: s.shortTermForeigners,
        longTerm: s.longTermForeigners,
        registered: s.registeredForeigners,
        residence: s.residenceReporters,
        d2: s.d2Students,
        d4: s.d4Trainees,
        "D-2 유학_momDelta": s.mom.d2Students.delta,
        "D-2 유학_momRate": s.mom.d2Students.rate,
        "D-2 유학_yoyDelta": s.yoy.d2Students.delta,
        "D-2 유학_yoyRate": s.yoy.d2Students.rate,
        "D-4 일반연수_momDelta": s.mom.d4Trainees.delta,
        "D-4 일반연수_momRate": s.mom.d4Trainees.rate,
        "D-4 일반연수_yoyDelta": s.yoy.d4Trainees.delta,
        "D-4 일반연수_yoyRate": s.yoy.d4Trainees.rate,
      })),
    [yearStats]
  );

  const yearlyChartData = useMemo(() => {
    const metric = selectedMetric === "all" ? "totalForeigners" : selectedMetric;
    return yearlySummaries.map((y) => ({
      label: `${y.year}년`,
      value: y[metric],
      name: METRIC_LABELS[metric],
    }));
  }, [yearlySummaries, selectedMetric]);

  const formatYAxis = (v: number) =>
    v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`;

  if (compact && periodView === "monthly") {
    return (
      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {selectedYear}년 월별 체류외국인
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="shortTerm"
                  name="단기체류"
                  stackId="a"
                  fill={METRIC_COLORS.shortTermForeigners}
                />
                <Bar
                  dataKey="registered"
                  name="등록외국인"
                  stackId="a"
                  fill={METRIC_COLORS.registeredForeigners}
                />
                <Bar
                  dataKey="residence"
                  name="거소신고자"
                  stackId="a"
                  fill={METRIC_COLORS.residenceReporters}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {selectedYear}년 D-2 / D-4 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                <Tooltip content={<D2D4Tooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="d2"
                  name="D-2 유학"
                  stroke={METRIC_COLORS.d2Students}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="d4"
                  name="D-4 일반연수"
                  stroke={METRIC_COLORS.d4Trainees}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {periodView === "monthly" ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {selectedYear}년 월별 전체 체류외국인 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="전체 체류외국인"
                    stroke={METRIC_COLORS.totalForeigners}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {selectedYear}년 단기/장기 체류외국인 비교
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="shortTerm"
                    name="단기체류"
                    stackId="a"
                    fill={METRIC_COLORS.shortTermForeigners}
                  />
                  <Bar
                    dataKey="longTerm"
                    name="장기체류"
                    stackId="a"
                    fill={METRIC_COLORS.longTermForeigners}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {selectedYear}년 등록외국인 vs 거소신고자
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="registered"
                    name="등록외국인"
                    stroke={METRIC_COLORS.registeredForeigners}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="residence"
                    name="거소신고자"
                    stroke={METRIC_COLORS.residenceReporters}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {selectedYear}년 D-2 / D-4 월별 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
                  <Tooltip content={<D2D4Tooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="d2"
                    name="D-2 유학"
                    stroke={METRIC_COLORS.d2Students}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="d4"
                    name="D-4 일반연수"
                    stroke={METRIC_COLORS.d4Trainees}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              연도별{" "}
              {selectedMetric === "all"
                ? "전체 체류외국인"
                : METRIC_LABELS[selectedMetric]}{" "}
              요약
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={yearlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="value"
                  name={
                    selectedMetric === "all"
                      ? "전체 체류외국인"
                      : METRIC_LABELS[selectedMetric]
                  }
                  fill={
                    selectedMetric === "all"
                      ? METRIC_COLORS.totalForeigners
                      : METRIC_COLORS[selectedMetric]
                  }
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
