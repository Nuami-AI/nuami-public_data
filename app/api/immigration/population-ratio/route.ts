import { NextRequest, NextResponse } from "next/server";
import { loadPopulationRatioTrend } from "@/lib/population/ratio";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") === "yearly" ? "yearly" : "monthly";
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const startYear = Number(searchParams.get("startYear") ?? year - 5);
  const endYear = Number(searchParams.get("endYear") ?? year);

  try {
    const data = await loadPopulationRatioTrend({
      view,
      year,
      startYear,
      endYear,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "인구 비율 조회 중 오류가 발생했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
