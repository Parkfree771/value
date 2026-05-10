# 13F 분기 갱신 가이드

구루 포트폴리오를 새 분기 데이터로 업데이트하는 절차.

## 13F 공시 일정

13F-HR은 **분기말 후 45일 이내** 제출 의무.

| 분기 | 분기말 | 공시 마감일 |
|------|--------|-------------|
| Q1   | 3/31   | **5/15**   |
| Q2   | 6/30   | **8/14**   |
| Q3   | 9/30   | **11/14**  |
| Q4   | 12/31  | **다음해 2/14** |

대부분 펀드는 마감일 1~3일 전에 일괄 제출하므로, **마감일 직후 1~2일 안에 갱신하는 것이 가장 안전**.

## 사전 준비

- Next.js 개발 서버가 `localhost:3000` 에서 실행 중이어야 함 (가격 채우기 단계에서 KIS API 라우트 사용)
- KIS API 환경변수 (`KIS_APP_KEY`, `KIS_APP_SECRET`, `KIS_BASE_URL`) `.env.local` 에 설정되어 있어야 함

## 갱신 순서

### 1) `scripts/fetch-13f.ts` 의 분기 상수 변경

```ts
// scripts/fetch-13f.ts 상단
const Q3_END = '2025-09-30';  // ← 직전 분기말 (비교 기준)
const Q4_END = '2025-12-31';  // ← 신규 분기말
```

변수명이 `Q3`/`Q4`이지만 실제로는 **이전 분기 / 현재 분기** 의미. 새 분기로 갱신할 때 두 값 모두 한 분기씩 미루면 됨.

**예시 — Q1 2026 갱신 시**
```ts
const Q3_END = '2025-12-31';  // (이전) Q4 2025
const Q4_END = '2026-03-31';  // (신규) Q1 2026
```

### 2) 전체 그루 13F 다시 받기

```powershell
npx tsx scripts/fetch-13f.ts --all
```

- 9명 전체를 SEC EDGAR에서 받아 `data/guru-portfolios.json` 으로 저장
- 신규 분기에 처음 매핑되는 종목이 있으면 출력 끝에 "미매핑 종목" 목록이 뜸
- `--name=<slug>` 으로 특정 그루만 갱신도 가능

### 3) 미매핑 CUSIP 자동 해결 (필요 시)

미매핑 종목이 출력되면:

```powershell
npx tsx scripts/resolve-cusips.ts
```

OpenFIGI API로 자동 매핑한 코드 스니펫을 콘솔에 출력. 출력 그대로 `lib/sec13f/cusipMap.ts` 의 `MANUAL_CUSIP_MAP` 안에 붙여넣기.

**검증 포인트**
- **티커**: OpenFIGI 결과 신뢰. 학습 지식과 다르면 OpenFIGI가 맞을 가능성 높음 (티커 변경 사례: 2026-01-14 MMC → MRSH)
- **거래소**: OpenFIGI 결과 신뢰하지 말 것 (NASDAQ 종목에 NYSE 표기 등 일관성 떨어짐). `public/data/global-stocks.json`에서 ticker로 검색해 확인하는 게 정확

매핑 추가 후 `npx tsx scripts/fetch-13f.ts --all` 다시 돌려서 미매핑 0건 확인.

### 4) 공시일 종가 채우기

```powershell
# Next.js dev 서버 별도 터미널에서 실행 중이어야 함
npm run dev

# 메인 터미널
npx tsx scripts/update-filing-prices.ts
```

- 각 보유 종목의 `price_at_filing`(공시일 종가)을 KIS API로 채움
- 약 5분 소요 (그루별 보유 종목 수에 따라 달라짐)
- 실패 종목이 있으면 콘솔에 출력 — KIS 데이터 누락이거나 티커 변경 케이스. 후자는 cusipMap 보정

### 5) 검증

```powershell
# 그루별 매핑/가격 카운트 확인
node -e "
const d=JSON.parse(require('fs').readFileSync('data/guru-portfolios.json','utf-8'));
for(const [slug,g] of Object.entries(d.gurus)){
  const total=g.holdings.filter(h=>h.status!=='SOLD OUT').length;
  const priced=g.holdings.filter(h=>h.status!=='SOLD OUT'&&h.price_at_filing).length;
  const unmapped=g.holdings.filter(h=>!h.ticker&&h.status!=='SOLD OUT'&&h.shares_curr>0).length;
  console.log(slug.padEnd(22)+'priced: '+priced+'/'+total+'  미매핑: '+unmapped);
}
"
```

이상적으로 모든 그루가 `priced: N/N`, `미매핑: 0`. 1~2건 누락은 보통 KIS 데이터 갭이라 무시해도 무방.

API 라우트는 1시간 메모리 캐시가 있어서 dev 서버 재시작해야 즉시 반영됨.

## 신규 그루 추가 시

1. `app/guru-tracker/types.ts` 의 `GURU_LIST` 에 항목 추가
   - SEC EDGAR에서 정확한 CIK 검증 필수 (활성 13F-HR 제출 여부 확인)
   - 동일 그루도 운용사 폐쇄/리브랜딩으로 CIK가 바뀐 경우 있음
2. `npx tsx scripts/fetch-13f.ts --name=<신규-slug>` 로 단일 처리
3. 위 (3)~(5) 동일 절차

## 주의사항

- **그린블라트(Gotham Asset Management)** 같은 **퀀트 펀드**는 1,000+ 종목을 들고 있어 전체 처리 시간/UI 노출에 부적합. 추가 전에 holdings_count 확인.
- **퀘이커 13F-NT** 만 제출하는 매니저는 보유 명세가 다른 매니저 신고에 포함되어 별도 트래킹 불가 (예: 2024년 이후 Greenlight Capital)
- **외국 본사 펀드** (케이맨 제도 등)는 13F 의무 면제 — 수년간 미제출 (예: Pabrai Investment Funds)
