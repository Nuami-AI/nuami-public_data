import { NextRequest, NextResponse } from "next/server";
import { searchRegionsByQuery } from "@/lib/immigration/yearbook/region-search";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";

    const data = searchRegionsByQuery(query);
    if (data.error && !data.matches.length && !data.result) {
      return NextResponse.json(data, { status: data.query ? 404 : 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/immigration/region-search]", error);
    const message =
      error instanceof Error ? error.message : "지역 검색 중 오류가 발생했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
