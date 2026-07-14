import { NextRequest, NextResponse } from "next/server";
import { loadVisaBreakdownForPeriod } from "@/lib/immigration/public-api/detail";
import { PublicApiError } from "@/lib/immigration/public-api";
import { splitVisaBreakdown } from "@/lib/immigration/visa";
import { formatDateKey } from "@/lib/immigration/formatters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "year, month 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const { items } = await loadVisaBreakdownForPeriod(year, month);
    const { focus, reference } = splitVisaBreakdown(items);

    return NextResponse.json({
      year,
      month,
      dateKey: formatDateKey(year, month),
      focus,
      reference,
      all: items,
    });
  } catch (error) {
    console.error("[api/immigration/visa]", error);
    const message =
      error instanceof PublicApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "비자 데이터를 불러올 수 없습니다";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
