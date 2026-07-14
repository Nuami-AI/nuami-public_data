import type { LucideIcon } from "lucide-react";

type DashboardPlaceholderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  items?: string[];
};

export function DashboardPlaceholder({
  title,
  description,
  icon: Icon,
  items = [],
}: DashboardPlaceholderProps) {
  return (
    <div className="flex min-h-[calc(100vh-0px)] flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
        <p className="text-[11px] font-medium text-slate-500">
          출입국·외국인정책본부 통계월보
        </p>
        <h1 className="text-lg font-bold text-slate-900 md:text-xl">{title}</h1>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-lg rounded-xl border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Icon className="h-7 w-7 text-slate-500" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-800">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
          {items.length > 0 && (
            <ul className="mt-4 space-y-1 text-left text-sm text-slate-600">
              {items.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  {item}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-xs text-slate-400">데이터 연동 준비 중입니다.</p>
        </div>
      </main>
    </div>
  );
}
