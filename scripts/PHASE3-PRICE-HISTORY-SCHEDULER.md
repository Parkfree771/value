# Phase 3: 가격 히스토리 일일 append (스케줄러 확장)

> 다른 PC(스케줄러 돌리는 본 PC)에서 작업해야 하는 미완료 항목.
> Phase 1·2·4·5 (라이브러리, 백필, API, 차트)는 이미 완료됨.

## 배경

- `prices-history/{TICKER}.json` Firebase Storage 파일에 종목별 일별 종가가 저장됨.
- 1회성 백필(`scripts/backfill-price-history.ts`)은 이미 돌렸음 → 기존 게시글 종목 48개는 채워져 있음.
- **앞으로 매일 어제 종가 한 줄씩 append 하는 로직이 빠져있음.** 이게 안 되면 차트가 백필 시점에서 멈춰버림.

## 해야 할 것

`scripts/local-price-updater.ts`의 `updatePrices(marketType)` 함수 끝에 한 단계 추가:

```
6. 각 ticker별로:
   a. lib/priceHistory.ts 의 readHistory(ticker) 호출
   b. 파일이 없으면 (= 신규 종목)
      → backfillTicker(ticker, exchange, 그 ticker 가장 오래된 게시글 createdAt) 호출
   c. 파일이 있고 마지막 row.d < 어제
      → fetchDailyRange(ticker, exchange, 마지막 row.d 다음 날, 어제) 으로 빈 날 받아서 append
      → writeHistory(merged) 저장
   d. 파일이 있고 마지막 row.d >= 어제
      → 스킵
```

## 구현 가이드

### 1. import 추가
`scripts/local-price-updater.ts` 상단 import에:

```ts
import {
  readHistory,
  writeHistory,
  fetchDailyRange,
  backfillTicker,
} from '../lib/priceHistory';
import type { FeedPost } from '../types/feed';
```

### 2. 헬퍼 함수 추가

```ts
/** 어제(YYYY-MM-DD) 반환 */
function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** ticker별 가장 오래된 게시글 createdAt 찾기 (신규 종목 백필용) */
function findOldestCreatedAt(posts: FeedPost[], ticker: string): Date | null {
  let oldest: Date | null = null;
  for (const p of posts) {
    if ((p.ticker || '').toUpperCase() !== ticker.toUpperCase()) continue;
    const d = new Date(p.createdAt);
    if (isNaN(d.getTime())) continue;
    if (!oldest || d < oldest) oldest = d;
  }
  return oldest;
}

/** 한 ticker의 history 파일을 어제까지 채움 */
async function syncHistoryForTicker(
  ticker: string,
  exchange: string,
  posts: FeedPost[]
): Promise<'created' | 'updated' | 'skipped' | 'failed'> {
  try {
    const existing = await readHistory(ticker);
    const yesterday = yesterdayStr();

    // 신규 종목 → 백필
    if (!existing || existing.history.length === 0) {
      const oldest = findOldestCreatedAt(posts, ticker);
      if (!oldest) return 'skipped';
      await backfillTicker(ticker, exchange, oldest);
      return 'created';
    }

    // 이미 어제까지 있으면 스킵
    const lastDate = existing.history[existing.history.length - 1].d;
    if (lastDate >= yesterday) return 'skipped';

    // 빈 날 받아서 append
    const fromDate = new Date(lastDate);
    fromDate.setDate(fromDate.getDate() + 1);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() - 1);

    const newPoints = await fetchDailyRange(ticker, exchange, fromDate, toDate);
    if (newPoints.length === 0) return 'skipped';

    const map = new Map<string, number>();
    for (const p of existing.history) map.set(p.d, p.c);
    for (const p of newPoints) map.set(p.d, p.c);
    const merged = Array.from(map.entries())
      .map(([d, c]) => ({ d, c }))
      .sort((a, b) => a.d.localeCompare(b.d));

    existing.history = merged;
    existing.lastUpdated = new Date().toISOString();
    existing.exchange = exchange.toUpperCase();
    await writeHistory(existing);
    return 'updated';
  } catch {
    return 'failed';
  }
}
```

### 3. `updatePrices()` 끝에 호출 추가

기존 5번(가격 병합·저장) 끝나고 6번 단계로:

```ts
// 6. 일별 종가 히스토리 동기화 (어제까지)
console.log('  히스토리 동기화 중...');
let histCreated = 0, histUpdated = 0, histSkipped = 0, histFailed = 0;
for (const [, { ticker, exchange }] of uniqueTickers) {
  const result = await syncHistoryForTicker(ticker, exchange, feedData.posts);
  if (result === 'created') histCreated++;
  else if (result === 'updated') histUpdated++;
  else if (result === 'skipped') histSkipped++;
  else histFailed++;
  await new Promise(r => setTimeout(r, 200)); // KIS rate limit
}
console.log(`  히스토리: 신규 ${histCreated} / 갱신 ${histUpdated} / 스킵 ${histSkipped} / 실패 ${histFailed}`);
```

## 동작 특성

- **하루 첫 실행:** ticker당 1 read + 1 KIS 일봉 + 1 write. 어제 종가 1줄 append.
- **같은 날 두 번째 이후:** ticker당 1 read만, lastDate >= yesterday 체크로 즉시 스킵.
- **신규 종목 자동 처리:** 새 게시글이 처음 등록한 ticker는 그 ticker만 즉석 백필.
- **rate limit 안전 마진:** ticker 간 200ms 딜레이 (총 100 ticker = +20s 추가).

## 테스트

1. 본 PC에서 `npx tsx scripts/local-price-updater.ts` 실행.
2. 첫 사이클에서 "히스토리 동기화 중..." 로그 확인.
3. Firebase Storage 콘솔에서 `prices-history/{TICKER}.json`의 `history` 마지막 row가 어제 날짜인지 확인.
4. 사이트 상세페이지 차트 우측 끝이 어제까지 이어지는지 확인.

## 참고

- 1회성 백필이 또 필요하면: `npx tsx scripts/backfill-price-history.ts` (skip-existing). 강제: `--force`.
- 단일 종목만: `npx tsx scripts/backfill-price-history.ts AAPL TSLA`.
- API 엔드포인트: `GET /api/prices-history/{TICKER}?from=YYYY-MM-DD`.
- 차트 컴포넌트: `components/PriceChart.tsx`. 백필 안 된 종목은 작성가→현재가 두 점 fallback.
