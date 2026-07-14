# 체류외국인 공공데이터 대시보드

대한민국 체류외국인 통계를 **공공데이터포털 API**로 자동 수집·시각화하는 Next.js 대시보드입니다.  
**2000년부터** 월별/연말 지표를 수집하며, XLSX 수동 업로드 없이 운영합니다.

## 기술 스택

- **Next.js 14** (App Router)
- **TypeScript** + **Zod**
- **Tailwind CSS** + shadcn/ui 스타일 컴포넌트
- **Recharts** (차트)
- **TanStack React Query** (클라이언트 페칭)
- **공공데이터포털 odcloud API** (`api.odcloud.kr`)

## 설치 및 실행

```bash
npm install
cp .env.example .env.local
# .env.local에 인증키·Endpoint 설정 후
npm run dev
```

- 홈: http://localhost:3000
- 대시보드: http://localhost:3000/dashboard/immigration

## 공공데이터 API 설정 (필수)

### 1. 활용신청 데이터셋

| 데이터셋 | ID | 용도 |
|---------|-----|------|
| 법무부_19 월별 체류외국인 현황 | [15100009](https://www.data.go.kr/data/15100009/fileData.do) | 월별 전체/단기/장기/등록/거소 |
| 법무부_18 연도별 체류외국인 현황 | [15100007](https://www.data.go.kr/data/15100007/fileData.do) | 2000년~ 연말(12월) 스냅샷 |
| 법무부_24 월별 체류자격별 현황 | [15100016](https://www.data.go.kr/data/15100016/fileData.do) | D-2, D-4 월별 |
| 법무부_23 연도별 체류자격별 현황 | [15100015](https://www.data.go.kr/data/15100015/fileData.do) | D-2, D-4 연말 (선택) |

### 2. 인증키·Endpoint 확인

1. [공공데이터포털](https://www.data.go.kr) 회원가입
2. 위 데이터셋 **활용신청** (개발단계 자동승인)
3. **마이페이지 → Open API → 활용신청 현황**
4. **일반인증키(Decoding)** 복사
5. 각 데이터셋 **Endpoint URL**에서 `15100xxx/v1/uddi:...` 경로 복사

### 3. `.env.local` 예시

```env
DATA_GO_KR_SERVICE_KEY=발급받은_디코딩_인증키
ODCLOUD_MONTHLY_PATH=15100009/v1/uddi:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ODCLOUD_YEARLY_PATH=15100007/v1/uddi:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ODCLOUD_VISA_PATH=15100016/v1/uddi:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ODCLOUD_VISA_YEARLY_PATH=15100015/v1/uddi:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ODCLOUD_MIN_YEAR=2000
```

## 데이터 수집 전략 (2000년~)

```
1. 연도별 API (15100007) → 12월 연말 스냅샷 (2000년~)
2. 월별 API (15100009)   → 상세 월별 데이터 (연도별 데이터 위에 오버레이)
3. 체류자격별 월별/연도별 → D-2, D-4 병합
4. ODCLOUD_MIN_YEAR(기본 2000) 이전 데이터 제외
5. 1시간 서버 캐시 (unstable_cache) 후 대시보드 제공
```

월별 데이터가 없는 과거 구간은 **연도별 연말(12월)** 값으로 자동 보완됩니다.

## API 응답 필드 매핑

**월별/연도별 현황**

| 원본 `구분` | 정규화 필드 |
|------------|------------|
| 전체/합계 | totalForeigners |
| 단기 | shortTermForeigners |
| 장기 | longTermForeigners |
| 등록 | registeredForeigners |
| 거소 | residenceReporters |

**체류자격별**

| 원본 `체류자격` | 정규화 필드 |
|----------------|------------|
| D-2 | d2Students |
| D-4 | d4Trainees |

## 프로젝트 구조

```
app/
  api/immigration/route.ts       # 공공데이터 API 프록시
  dashboard/immigration/page.tsx
lib/immigration/
  public-api/                    # odcloud 클라이언트·변환·캐시
    config.ts, client.ts, transform.ts, index.ts
  loader.ts                      # API 전용 로더
  transform.ts, calculations.ts, types.ts, constants.ts
components/dashboard/            # KPI, 차트, 테이블, 필터
```

## API

### `GET /api/immigration`

```json
{
  "stats": [...],
  "yearlySummaries": [...],
  "availableYears": [2000, 2001, "..."],
  "source": "api",
  "sourceMessage": "공공데이터포털 API (2000년~, 312개월)",
  "lastUpdated": "2026-05"
}
```

환경변수 미설정 또는 API 오류 시 HTTP 500과 함께 오류 메시지를 반환합니다.

## 라이선스

MIT
