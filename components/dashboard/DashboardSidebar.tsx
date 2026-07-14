"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_NAV, isNavActive } from "@/lib/dashboard/navigation";
import { cn } from "@/lib/utils";

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-40 flex h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-[#1a2f4a] text-white lg:w-60">
      <div className="border-b border-white/10 px-4 py-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-blue-200/80">
          이민행정 빅데이터
        </p>
        <p className="mt-1 text-sm font-semibold leading-snug">분석·시각화</p>
      </div>

      <nav className="flex-1 space-y-4 px-2 py-4" aria-label="대시보드 메뉴">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-blue-200/60">
          카테고리
        </p>

        {DASHBOARD_NAV.map((section) => {
          const SectionIcon = section.icon;
          const sectionActive = section.items.some((item) =>
            isNavActive(pathname, item.href)
          );

          return (
            <div key={section.id}>
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold",
                  sectionActive ? "text-blue-100" : "text-blue-200/70"
                )}
              >
                <SectionIcon className="h-3.5 w-3.5 shrink-0" />
                <span>{section.label}</span>
              </div>

              <ul className="mt-1 space-y-0.5">
                {section.items.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  const ItemIcon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-white/15 font-medium text-white"
                            : "text-white/75 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {ItemIcon ? (
                          <ItemIcon className="h-4 w-4 shrink-0 opacity-80" />
                        ) : (
                          <span className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4 text-[10px] leading-relaxed text-blue-200/70">
        <p className="font-medium text-blue-100">법무부</p>
        <p className="mt-1">외국인정보빅데이터팀</p>
        <p className="mt-2 text-white/50">통계월보 기반 공공데이터</p>
      </div>
    </aside>
  );
}
