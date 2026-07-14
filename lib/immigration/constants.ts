/** 공공데이터 수집 시작 연도 */
export const MIN_COLLECTION_YEAR = 2000;

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function isWithinCollectionRange(year: number): boolean {
  return year >= MIN_COLLECTION_YEAR && year <= getCurrentYear();
}
