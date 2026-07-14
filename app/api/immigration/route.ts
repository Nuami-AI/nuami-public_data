import { NextResponse } from "next/server";
import { loadImmigrationData } from "@/lib/immigration/loader";
import { PublicApiError } from "@/lib/immigration/public-api";
import type { ImmigrationApiResponse } from "@/lib/immigration/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await loadImmigrationData();

    const response: ImmigrationApiResponse = {
      stats: data.stats,
      yearlySummaries: data.yearlySummaries,
      availableYears: data.availableYears,
      source: data.source,
      sourceMessage: data.sourceMessage,
      lastUpdated: data.lastUpdated,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/immigration]", error);

    const message =
      error instanceof PublicApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "데이터를 불러올 수 없습니다";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
