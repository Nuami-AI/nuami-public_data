import type { LucideIcon } from "lucide-react";
import { BarChart3, Globe2, MapPin, Users } from "lucide-react";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
};

export type DashboardNavSection = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: DashboardNavItem[];
};

export const DASHBOARD_NAV: DashboardNavSection[] = [
  {
    id: "global",
    label: "세계 이민자 현황",
    icon: Globe2,
    items: [
      { label: "국가별 인구·이민자", href: "/dashboard/global" },
    ],
  },
  {
    id: "domestic",
    label: "국내 이민자 현황",
    icon: MapPin,
    items: [
      { label: "지역별 인구·체류자", href: "/dashboard/domestic" },
      { label: "시·도별 국적·비자", href: "/dashboard/domestic/nationality" },
      { label: "지역별 비자·국적 검색", href: "/dashboard/domestic/region" },
      { label: "지역별 체류외국인 (상세)", href: "/dashboard/domestic/detail" },
    ],
  },
  {
    id: "stats",
    label: "이민·체류 통계",
    icon: BarChart3,
    items: [
      { label: "체류외국인", href: "/dashboard/immigration", icon: Users },
    ],
  },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard/immigration") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
