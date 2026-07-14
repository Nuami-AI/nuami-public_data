const SIDO_PATTERN =
  /^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|제주특별자치도|경기도|강원특별자치도|충청북도|충청남도|전북특별자치도|전라남도|경상북도|경상남도)\s+(\S+)/;

export function parseKoreanAddress(address: string): { sido: string; sigungu: string } {
  const normalized = address.normalize("NFC").trim();
  const match = normalized.match(SIDO_PATTERN);
  if (!match) {
    return { sido: "", sigungu: "" };
  }

  const sido = match[1];
  if (sido === "세종특별자치시") {
    return { sido, sigungu: "세종특별자치시" };
  }

  return { sido, sigungu: match[2] };
}

export function regionKey(sido: string, sigungu: string): string {
  return `${sido}|${sigungu}`;
}
