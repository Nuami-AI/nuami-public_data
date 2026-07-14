import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
          체류외국인 공공데이터 대시보드
        </h1>
        <p className="mt-3 text-slate-600">
          월별·연도별 체류외국인 통계를 한눈에 확인하세요
        </p>
      </div>
      <Link
        href="/dashboard/immigration"
        className="rounded-lg bg-dashboard-blue px-6 py-3 font-medium text-white shadow-md transition hover:bg-blue-700"
      >
        대시보드 바로가기
      </Link>
    </main>
  );
}
