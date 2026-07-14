"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  METRIC_KEYS,
  METRIC_LABELS,
  type MetricKey,
  type PeriodView,
} from "@/lib/immigration/types";

export type FilterState = {
  year: number | "all";
  month: number | "all";
  metric: MetricKey | "all";
  periodView: PeriodView;
};

type FilterBarProps = {
  filters: FilterState;
  availableYears: number[];
  onChange: (filters: Partial<FilterState>) => void;
};

export function FilterBar({
  filters,
  availableYears,
  onChange,
}: FilterBarProps) {
  return (
    <div
      className="flex flex-wrap items-end gap-4 rounded-lg border bg-white p-4 shadow-sm"
      role="search"
      aria-label="대시보드 필터"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="year-filter" className="text-xs font-medium text-slate-500">
          연도
        </label>
        <Select
          value={String(filters.year)}
          onValueChange={(v) =>
            onChange({ year: v === "all" ? "all" : parseInt(v, 10) })
          }
        >
          <SelectTrigger id="year-filter" className="w-[120px]" aria-label="연도 선택">
            <SelectValue placeholder="연도" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="month-filter" className="text-xs font-medium text-slate-500">
          월
        </label>
        <Select
          value={String(filters.month)}
          onValueChange={(v) =>
            onChange({ month: v === "all" ? "all" : parseInt(v, 10) })
          }
        >
          <SelectTrigger id="month-filter" className="w-[100px]" aria-label="월 선택">
            <SelectValue placeholder="월" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={String(m)}>
                {m}월
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="metric-filter" className="text-xs font-medium text-slate-500">
          지표
        </label>
        <Select
          value={filters.metric}
          onValueChange={(v) => onChange({ metric: v as MetricKey | "all" })}
        >
          <SelectTrigger id="metric-filter" className="w-[160px]" aria-label="지표 선택">
            <SelectValue placeholder="지표" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {METRIC_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {METRIC_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="period-filter" className="text-xs font-medium text-slate-500">
          기간 보기
        </label>
        <Select
          value={filters.periodView}
          onValueChange={(v) => onChange({ periodView: v as PeriodView })}
        >
          <SelectTrigger id="period-filter" className="w-[120px]" aria-label="기간 보기 방식">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">월별</SelectItem>
            <SelectItem value="yearly">연도별</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
