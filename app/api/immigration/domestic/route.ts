import { NextRequest, NextResponse } from "next/server";
import { loadDomesticImmigrationData, PublicApiError } from "@/lib/immigration/public-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    const sido = searchParams.get("sido") ?? undefined;
    const level = searchParams.get("level") === "sigungu" ? "sigungu" : "sido";

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "year, month 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const data = await loadDomesticImmigrationData(year, month, { sido, level });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/immigration/domestic]", error);
    const message =
      error instanceof PublicApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "국내 이민자 데이터를 불러올 수 없습니다";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
