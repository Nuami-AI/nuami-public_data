"use client";

import { Info, TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatComparison, formatNumber } from "@/lib/immigration/formatters";
import type { ComparisonResult } from "@/lib/immigration/types";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  title: string;
  description: string;
  value: number;
  mom: ComparisonResult;
  yoy: ComparisonResult;
  accentColor?: string;
  className?: string;
};

function ComparisonRow({
  label,
  comparison,
}: {
  label: string;
  comparison: ComparisonResult;
}) {
  const { deltaText, rateText, direction } = formatComparison(comparison);

  const Icon =
    direction === "up"
      ? TrendingUp
      : direction === "down"
        ? TrendingDown
        : Minus;

  const colorClass =
    direction === "up"
      ? "text-emerald-600"
      : direction === "down"
        ? "text-red-500"
        : "text-slate-400";

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <div className={cn("flex items-center gap-1 font-medium", colorClass)}>
        <Icon className="h-3 w-3" aria-hidden="true" />
        <span aria-label={`${label} 증감 ${deltaText}, ${rateText}`}>
          {deltaText} ({rateText})
        </span>
      </div>
    </div>
  );
}

export function KpiCard({
  title,
  description,
  value,
  mom,
  yoy,
  accentColor = "#2563eb",
  className,
}: KpiCardProps) {
  return (
    <TooltipProvider>
      <div
        className={cn(
          "group relative overflow-hidden rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
          className
        )}
        role="region"
        aria-label={`${title} KPI 카드`}
      >
        <div
          className="absolute left-0 top-0 h-1 w-full"
          style={{ backgroundColor: accentColor }}
        />

        <div className="flex items-start justify-between">
          <h3 className="text-sm font-medium text-slate-600">{title}</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                aria-label={`${title} 설명`}
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>{description}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <p className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
          {formatNumber(value)}
          <span className="ml-1 text-sm font-normal text-slate-500">명</span>
        </p>

        <div className="mt-3 space-y-1.5 border-t pt-3">
          <ComparisonRow label="전월 대비" comparison={mom} />
          <ComparisonRow label="전년 동월" comparison={yoy} />
        </div>
      </div>
    </TooltipProvider>
  );
}
