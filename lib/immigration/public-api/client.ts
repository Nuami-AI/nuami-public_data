import type { PublicApiConfig } from "./config";

export type OdcloudResponse<T = Record<string, unknown>> = {
  page: number;
  perPage: number;
  totalCount: number;
  currentCount: number;
  matchCount: number;
  data: T[];
  code?: number;
  msg?: string;
};

export type FetchOptions = {
  minYear?: number;
};

export class PublicApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number
  ) {
    super(message);
    this.name = "PublicApiError";
  }
}

function buildUrl(
  config: PublicApiConfig,
  path: string,
  page: number,
  perPage: number,
  options?: FetchOptions
) {
  const base = config.baseUrl.replace(/\/$/, "");
  const normalizedPath = path.replace(/^\//, "");
  const url = new URL(`${base}/${normalizedPath}`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("serviceKey", config.serviceKey);

  if (options?.minYear) {
    url.searchParams.set(`cond[년::GTE]`, String(options.minYear));
  }

  return url.toString();
}

export async function fetchOdcloudPage<T = Record<string, unknown>>(
  config: PublicApiConfig,
  path: string,
  page = 1,
  perPage = 1000,
  options?: FetchOptions
): Promise<OdcloudResponse<T>> {
  const url = buildUrl(config, path, page, perPage, options);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new PublicApiError(`공공데이터 API HTTP ${res.status}`, res.status);
  }

  const json = (await res.json()) as OdcloudResponse<T> & {
    code?: number;
    msg?: string;
  };

  if (json.code !== undefined && json.code < 0) {
    throw new PublicApiError(json.msg ?? "공공데이터 API 오류", json.code);
  }

  if (!Array.isArray(json.data)) {
    throw new PublicApiError("공공데이터 API 응답 형식이 올바르지 않습니다");
  }

  return json;
}

export async function fetchAllOdcloudRows<T = Record<string, unknown>>(
  config: PublicApiConfig,
  path: string,
  perPage = 1000,
  options?: FetchOptions
): Promise<T[]> {
  const rows: T[] = [];
  let page = 1;
  let totalCount = Infinity;

  while (rows.length < totalCount) {
    const response = await fetchOdcloudPage<T>(
      config,
      path,
      page,
      perPage,
      options
    );
    totalCount = response.totalCount ?? rows.length + response.data.length;
    rows.push(...response.data);

    if (response.data.length === 0) {
      break;
    }

    if (response.data.length < perPage) {
      break;
    }

    page += 1;
    if (page > 500) {
      throw new PublicApiError("공공데이터 페이지 조회 한도를 초과했습니다");
    }
  }

  return rows;
}

/** 선택 데이터셋 — 실패 시 빈 배열 (상세 API 전체 중단 방지) */
export async function fetchOptionalOdcloudRows<T = Record<string, unknown>>(
  config: PublicApiConfig,
  path: string,
  perPage = 1000,
  options?: FetchOptions
): Promise<T[]> {
  if (!path) return [];

  try {
    return await fetchAllOdcloudRows<T>(config, path, perPage, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[odcloud] Optional dataset skipped (${path}): ${message}`);
    return [];
  }
}
