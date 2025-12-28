// 동적 종목 리스트 생성 (Posts + 구루 포트폴리오)
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import guruPortfolioData from './guru-portfolio-data.json';

/**
 * 사용자 게시글에서 ticker 수집 (posts + market-call)
 * 15분마다 실시간 업데이트용
 */
export async function getUserPostsTickers(): Promise<string[]> {
  const tickersSet = new Set<string>();

  // 1. posts 컬렉션
  try {
    const postsSnapshot = await getDocs(collection(db, 'posts'));
    postsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.ticker && typeof data.ticker === 'string') {
        tickersSet.add(data.ticker.toUpperCase().trim());
      }
    });
    console.log(`[User Tickers] Found ${tickersSet.size} tickers from ${postsSnapshot.size} posts`);
  } catch (error) {
    console.error('[User Tickers] Failed to fetch posts:', error);
  }

  // 2. market-call 컬렉션
  try {
    const marketCallSnapshot = await getDocs(collection(db, 'market-call'));
    let marketCallCount = 0;
    marketCallSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.ticker && typeof data.ticker === 'string') {
        tickersSet.add(data.ticker.toUpperCase().trim());
        marketCallCount++;
      }
    });
    console.log(`[User Tickers] Found ${marketCallCount} tickers from ${marketCallSnapshot.size} market-call posts`);
  } catch (error) {
    console.error('[User Tickers] Failed to fetch market-call:', error);
  }

  console.log(`[User Tickers] Total unique user tickers: ${tickersSet.size}`);
  return Array.from(tickersSet).sort();
}

/**
 * 구루 포트폴리오에서 ticker 수집 (JSON 파일에서 읽기)
 * 매일 한 번만 업데이트용 (종가)
 */
export async function getGuruTickers(): Promise<string[]> {
  const tickersSet = new Set<string>();

  // JSON 파일에서 구루 포트폴리오 데이터 읽기
  Object.values(guruPortfolioData.gurus).forEach((guru) => {
    guru.holdings.forEach((holding) => {
      if (holding.ticker) {
        tickersSet.add(holding.ticker.toUpperCase().trim());
      }
    });
  });

  console.log(`[Guru Tickers] Found ${tickersSet.size} tickers from ${Object.keys(guruPortfolioData.gurus).length} guru portfolios (JSON)`);
  return Array.from(tickersSet).sort();
}

/**
 * 모든 unique ticker 수집 (하위 호환성)
 * @deprecated 대신 getUserPostsTickers() 또는 getGuruTickers() 사용
 */
export async function getAllUniqueTickers(): Promise<string[]> {
  const userTickers = await getUserPostsTickers();
  const guruTickers = await getGuruTickers();

  const allTickers = new Set([...userTickers, ...guruTickers]);
  console.log(`[All Tickers] Total unique tickers: ${allTickers.size}`);

  return Array.from(allTickers).sort();
}
