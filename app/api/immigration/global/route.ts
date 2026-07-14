import { NextRequest, NextResponse } from "next/server";
import { loadGlobalImmigrationData, PublicApiError } from "@/lib/immigration/public-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year"));

    if (!Number.isFinite(year)) {
      return NextResponse.json(
        { error: "year 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const data = await loadGlobalImmigrationData(year);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/immigration/global]", error);
    const message =
      error instanceof PublicApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "세계 이민자 데이터를 불러올 수 없습니다";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
