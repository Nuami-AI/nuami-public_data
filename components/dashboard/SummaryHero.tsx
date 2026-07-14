"use client";

import { formatNumber } from "@/lib/immigration/formatters";
import type { StatWithComparisons } from "@/lib/immigration/types";
import { cn } from "@/lib/utils";

type SummaryHeroProps = {
  stat: StatWithComparisons;
  onVisaClick?: (visa: "D-2" | "D-4") => void;
};

function SubCard({
  label,
  value,
  color,
  onClick,
  clickable,
}: {
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
  clickable?: boolean;
}) {
  const content = (
    <>
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">
        {formatNumber(value)}
        <span className="ml-1 text-sm font-normal text-slate-500">명</span>
      </p>
    </>
  );

  if (clickable && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "rounded-lg border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400",
          "cursor-pointer"
        )}
        style={{ borderTopWidth: 4, borderTopColor: color }}
      >
        {content}
        <p className="mt-2 text-[11px] text-blue-600">클릭하여 상세 보기 →</p>
      </button>
    );
  }

  return (
    <div
      className="rounded-lg border bg-white p-4 shadow-sm"
      style={{ borderTopWidth: 4, borderTopColor: color }}
    >
      {content}
    </div>
  );
}

export function SummaryHero({ stat, onVisaClick }: SummaryHeroProps) {
  return (
    <section
      className="rounded-xl border bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm md:p-6"
      aria-label="체류외국인 요약"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">체류외국인 (단기+장기 체류외국인)</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 md:text-4xl">
            {formatNumber(stat.totalForeigners)}
            <span className="ml-2 text-lg font-normal text-slate-500">명</span>
          </p>
        </div>
        <div className="rounded-md bg-dashboard-navy px-3 py-2 text-xs text-blue-100">
          {stat.year}년 {stat.month}월 기준
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SubCard
          label="단기체류외국인"
          value={stat.shortTermForeigners}
          color="#14b8a6"
        />
        <div className="rounded-lg border border-pink-100 bg-pink-50/40 p-3 sm:col-span-1 lg:col-span-1">
          <p className="mb-2 text-xs font-semibold text-pink-700">장기체류외국인</p>
          <p className="text-lg font-bold text-slate-900">
            {formatNumber(stat.longTermForeigners)}
            <span className="ml-1 text-sm font-normal text-slate-500">명</span>
          </p>
          <div className="mt-3 grid gap-2">
            <div className="rounded-md bg-white px-3 py-2">
              <p className="text-[11px] text-slate-500">등록외국인</p>
              <p className="font-semibold text-slate-800">
                {formatNumber(stat.registeredForeigners)}명
              </p>
            </div>
            <div className="rounded-md bg-white px-3 py-2">
              <p className="text-[11px] text-slate-500">거소신고자</p>
              <p className="font-semibold text-slate-800">
                {formatNumber(stat.residenceReporters)}명
              </p>
            </div>
          </div>
        </div>
        <SubCard
          label="D-2 유학"
          value={stat.d2Students}
          color="#3b82f6"
          clickable
          onClick={() => onVisaClick?.("D-2")}
        />
        <SubCard
          label="D-4 일반연수"
          value={stat.d4Trainees}
          color="#06b6d4"
          clickable
          onClick={() => onVisaClick?.("D-4")}
        />
      </div>
    </section>
  );
}
