"use client";

import { Database } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DashboardPeriodHeaderProps = {
  subtitle: string;
  title: string;
  periodLabel?: string;
  year: number;
  month: number;
  availableYears: number[];
  sourceMessage?: string;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  showMonth?: boolean;
  dataSourceLabel?: string;
  extra?: React.ReactNode;
};

export function DashboardPeriodHeader({
  subtitle,
  title,
  periodLabel,
  year,
  month,
  availableYears,
  sourceMessage,
  onYearChange,
  onMonthChange,
  showMonth = true,
  dataSourceLabel = "공공데이터 API",
  extra,
}: DashboardPeriodHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-slate-500">{subtitle}</p>
          <h1 className="text-lg font-bold text-slate-900 md:text-xl">{title}</h1>
          {periodLabel && <p className="text-xs text-slate-500">{periodLabel}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {extra}
          <Select value={String(year)} onValueChange={(v) => onYearChange(parseInt(v, 10))}>
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

          {showMonth && (
            <Select value={String(month)} onValueChange={(v) => onMonthChange(parseInt(v, 10))}>
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
          )}

          <div className="hidden items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-[11px] text-slate-600 sm:flex">
            <Database className="h-3.5 w-3.5" />
            {dataSourceLabel}
          </div>
        </div>
      </div>
      {sourceMessage && (
        <p className="mt-1 text-[11px] text-slate-400">{sourceMessage}</p>
      )}
    </header>
  );
}
