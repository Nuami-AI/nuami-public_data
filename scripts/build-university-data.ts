import fs from "fs";
import path from "path";
import { parseKoreanAddress } from "../lib/immigration/universities/parse-address";

type RawUniversity = {
  SCHL_NM: string;
  MAINBRANCH_NM: string;
  UNIV_SE_NM: string;
  SCHL_SE_NM: string;
  FNDN_FORM_SE_NM: string;
  CTPV_NM: string;
  LCTN_ROAD_NM_ADDR: string;
  HMPG_ADDR?: string;
};

type UniversityRecord = {
  name: string;
  campusType: string;
  schoolCategory: string;
  schoolType: string;
  establishment: string;
  sido: string;
  sigungu: string;
  address: string;
  homepage?: string;
  isCyber: boolean;
};

const OUTPUT_PATH = path.join(
  process.cwd(),
  "lib/immigration/universities/schools.json"
);

const UNDERGRADUATE_CATEGORIES = new Set(["대학", "전문대학"]);
const RELEVANT_SCHOOL_TYPES = new Set([
  "대학교",
  "전문대학",
  "교육대학",
  "사이버대학(대학)",
  "산업대학",
]);

async function fetchUniversityRows(): Promise<RawUniversity[]> {
  const cookieJar = new Map<string, string>();

  const fetchWithCookies = async (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (cookieJar.size) {
      headers.set(
        "Cookie",
        Array.from(cookieJar.entries())
          .map(([key, value]) => `${key}=${value}`)
          .join("; ")
      );
    }

    const response = await fetch(url, { ...init, headers });
    const setCookie = response.headers.getSetCookie?.() ?? [];
    for (const cookie of setCookie) {
      const [pair] = cookie.split(";");
      const [key, value] = pair.split("=");
      if (key && value) cookieJar.set(key, value);
    }

    return response;
  };

  await fetchWithCookies("https://www.data.go.kr/data/15107736/standard.do");
  const headerResponse = await fetchWithCookies(
    "https://www.data.go.kr/download/columList.json?pk=15107736&ext=JSON",
    {
      headers: {
        Referer: "https://www.data.go.kr/data/15107736/standard.do",
      },
    }
  );

  if (!headerResponse.ok) {
    throw new Error(`컬럼 메타 조회 실패: HTTP ${headerResponse.status}`);
  }

  const header = (await headerResponse.json()) as {
    totalCount: number;
    tableVO: { colNmList: string[]; svcTableNm: string };
  };

  const params = new URLSearchParams();
  for (const column of header.tableVO.colNmList) {
    params.append("colNmList", column);
  }
  params.set("totalCount", String(header.totalCount));
  params.set("svcTableNm", header.tableVO.svcTableNm);
  params.set("perPage", "10000");
  params.set("page", "1");

  const dataResponse = await fetchWithCookies(
    `https://www.data.go.kr/download/standard.json?publicDataPk=15107736&${params.toString()}`,
    {
      headers: {
        Referer: "https://www.data.go.kr/data/15107736/standard.do",
      },
    }
  );

  if (!dataResponse.ok) {
    throw new Error(`대학 데이터 조회 실패: HTTP ${dataResponse.status}`);
  }

  return (await dataResponse.json()) as RawUniversity[];
}

function normalizeRecord(row: RawUniversity): UniversityRecord | null {
  if (!UNDERGRADUATE_CATEGORIES.has(row.UNIV_SE_NM)) return null;
  if (!RELEVANT_SCHOOL_TYPES.has(row.SCHL_SE_NM)) return null;
  if (row.SCHL_NM.includes("대학원")) return null;

  const address = String(row.LCTN_ROAD_NM_ADDR ?? "").trim();
  const { sido, sigungu } = parseKoreanAddress(address);
  if (!sido || !sigungu) return null;

  return {
    name: row.SCHL_NM,
    campusType: row.MAINBRANCH_NM,
    schoolCategory: row.UNIV_SE_NM,
    schoolType: row.SCHL_SE_NM,
    establishment: row.FNDN_FORM_SE_NM,
    sido: row.CTPV_NM || sido,
    sigungu,
    address,
    homepage: row.HMPG_ADDR?.trim() || undefined,
    isCyber: row.SCHL_SE_NM.includes("사이버"),
  };
}

async function main() {
  const rows = await fetchUniversityRows();
  const schools = rows
    .map(normalizeRecord)
    .filter((item): item is UniversityRecord => item !== null)
    .sort((a, b) => a.sido.localeCompare(b.sido, "ko") || a.sigungu.localeCompare(b.sigungu, "ko") || a.name.localeCompare(b.name, "ko"));

  const payload = {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: "교육부·한국대학교육협의회 전국대학및전문대학정보표준데이터 (15107736)",
    count: schools.length,
    schools,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${schools.length} schools to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
