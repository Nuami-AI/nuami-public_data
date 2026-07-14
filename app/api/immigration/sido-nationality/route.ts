import { NextRequest, NextResponse } from "next/server";
import { loadSidoNationalityOverview } from "@/lib/immigration/yearbook/region-search";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sido = searchParams.get("sido") ?? "";
    const nationality = searchParams.get("nationality") ?? "";

    const data = loadSidoNationalityOverview(sido, nationality);
    if (data.error && !data.districts.length) {
      return NextResponse.json(data, { status: sido && nationality ? 404 : 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/immigration/sido-nationality]", error);
    const message =
      error instanceof Error ? error.message : "시·도별 국적 조회 중 오류가 발생했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
