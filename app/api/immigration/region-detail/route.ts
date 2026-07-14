import { NextRequest, NextResponse } from "next/server";
import { loadRegionDetail } from "@/lib/immigration/yearbook/region-detail";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);

  if (!query) {
    return NextResponse.json({ error: "검색어(q)가 필요합니다." }, { status: 400 });
  }

  try {
    const data = await loadRegionDetail(query, year, month);
    if (data.error && !data.foreignerCount) {
      return NextResponse.json(data, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "지역 상세 조회 중 오류가 발생했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
