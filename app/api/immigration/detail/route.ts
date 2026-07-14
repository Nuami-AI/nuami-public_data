import { NextRequest, NextResponse } from "next/server";
import { loadVisaDetail } from "@/lib/immigration/public-api/detail";
import { PublicApiError } from "@/lib/immigration/public-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const visa = searchParams.get("visa");
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (!visa) {
      return NextResponse.json({ error: "visa 파라미터가 필요합니다." }, { status: 400 });
    }

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "year, month 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const detail = await loadVisaDetail(visa, year, month);
    return NextResponse.json(detail);
  } catch (error) {
    console.error("[api/immigration/detail]", error);
    const message =
      error instanceof PublicApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "상세 데이터를 불러올 수 없습니다";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
