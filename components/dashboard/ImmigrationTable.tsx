"use client";

import { useMemo, useState } from "react";
import { Download, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/immigration/formatters";
import type { StatWithComparisons } from "@/lib/immigration/types";

type SortKey = "year" | "month" | "totalForeigners";
type SortDir = "asc" | "desc";

type ImmigrationTableProps = {
  data: StatWithComparisons[];
};

function downloadCsv(data: StatWithComparisons[], filename: string) {
  const headers = [
    "연도",
    "월",
    "전체 체류외국인",
    "단기체류외국인",
    "장기체류외국인",
    "등록외국인",
    "거소신고자",
    "D-2",
    "D-4",
    "전월대비(%)",
    "전년동월대비(%)",
  ];

  const rows = data.map((s) => [
    s.year,
    s.month,
    s.totalForeigners,
    s.shortTermForeigners,
    s.longTermForeigners,
    s.registeredForeigners,
    s.residenceReporters,
    s.d2Students,
    s.d4Trainees,
    s.mom.totalForeigners.rate ?? "",
    s.yoy.totalForeigners.rate ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ImmigrationTable({ data }: ImmigrationTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("year");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = [...data];

    if (q) {
      result = result.filter(
        (s) =>
          `${s.year}`.includes(q) ||
          `${s.month}`.includes(q) ||
          s.dateKey.includes(q)
      );
    }

    result.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [data, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="text-base">월별 상세 데이터</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="연도·월 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[180px]"
            aria-label="데이터 검색"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(filtered, `immigration-stats-${Date.now()}.csv`)
            }
            aria-label="CSV 다운로드"
          >
            <Download className="mr-1 h-4 w-4" />
            CSV 다운로드
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm" aria-label="체류외국인 월별 통계">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs text-slate-500">
              <th className="px-3 py-2">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-slate-700"
                  onClick={() => toggleSort("year")}
                >
                  연도 <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-2">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-slate-700"
                  onClick={() => toggleSort("month")}
                >
                  월 <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-2 text-right">
                <button
                  type="button"
                  className="ml-auto flex items-center gap-1 hover:text-slate-700"
                  onClick={() => toggleSort("totalForeigners")}
                >
                  전체 <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-2 text-right">단기</th>
              <th className="px-3 py-2 text-right">장기</th>
              <th className="px-3 py-2 text-right">등록</th>
              <th className="px-3 py-2 text-right">거소</th>
              <th className="px-3 py-2 text-right">D-2</th>
              <th className="px-3 py-2 text-right">D-4</th>
              <th className="px-3 py-2 text-right">전월(%)</th>
              <th className="px-3 py-2 text-right">전년(%)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-slate-400">
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.dateKey}
                  className="border-b hover:bg-slate-50/80"
                >
                  <td className="px-3 py-2">{s.year}</td>
                  <td className="px-3 py-2">{s.month}월</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatNumber(s.totalForeigners)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(s.shortTermForeigners)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(s.longTermForeigners)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(s.registeredForeigners)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(s.residenceReporters)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(s.d2Students)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(s.d4Trainees)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatPercent(s.mom.totalForeigners.rate)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatPercent(s.yoy.totalForeigners.rate)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
