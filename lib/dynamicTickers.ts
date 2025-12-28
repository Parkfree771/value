// 동적 종목 리스트 생성 (Posts + 구루 포트폴리오)
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { GURU_PORTFOLIOS } from '@/app/guru-tracker/portfolioData';

/**
 * Firestore posts와 구루 포트폴리오에서 모든 unique ticker 수집
 * @returns 중복 제거된 ticker 배열 (정렬됨)
 */
export async function getAllUniqueTickers(): Promise<string[]> {
  const tickersSet = new Set<string>();

  // 1. Firestore posts 컬렉션에서 ticker 수집
  try {
    const postsSnapshot = await getDocs(collection(db, 'posts'));
    let postsCount = 0;

    postsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.ticker && typeof data.ticker === 'string') {
        // 대문자로 정규화하여 저장
        tickersSet.add(data.ticker.toUpperCase().trim());
        postsCount++;
      }
    });

    console.log(`[Tickers] Found ${postsCount} tickers from ${postsSnapshot.size} posts`);
  } catch (error) {
    console.error('[Tickers] Failed to fetch posts:', error);
    // 계속 진행 - 구루 포트폴리오 종목은 가져올 수 있음
  }

  // 2. 구루 포트폴리오에서 ticker 수집
  let guruTickersCount = 0;
  Object.values(GURU_PORTFOLIOS).forEach((portfolio) => {
    portfolio.holdings.forEach((holding) => {
      if (holding.ticker) {
        tickersSet.add(holding.ticker.toUpperCase().trim());
        guruTickersCount++;
      }
    });
  });

  console.log(`[Tickers] Found ${guruTickersCount} tickers from guru portfolios (${Object.keys(GURU_PORTFOLIOS).length} gurus)`);

  const totalTickers = tickersSet.size;
  console.log(`[Tickers] Total unique tickers: ${totalTickers}`);

  // 정렬해서 반환 (로그 확인 시 편리)
  return Array.from(tickersSet).sort();
}
