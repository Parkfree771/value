// 동적 종목 리스트 생성 (서버 사이드 전용 - Admin SDK 사용)
import { adminDb } from './firebase-admin';
import guruPortfolioData from './guru-portfolio-data.json';

/**
 * Posts 컬렉션에서 document ID와 ticker 쌍 수집 (Admin SDK)
 * 크론이 각 post의 currentPrice를 업데이트하기 위해 사용
 */
export async function getPostsWithTickers(): Promise<Array<{ docId: string; ticker: string }>> {
  const posts: Array<{ docId: string; ticker: string }> = [];

  try {
    const postsSnapshot = await adminDb.collection('posts').get();
    postsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.ticker && typeof data.ticker === 'string') {
        posts.push({
          docId: doc.id,
          ticker: data.ticker.toUpperCase().trim(),
        });
      }
    });
    console.log(`[Posts with Tickers] Found ${posts.length} posts`);
  } catch (error) {
    console.error('[Posts with Tickers] Failed to fetch posts:', error);
  }

  return posts;
}

/**
 * @deprecated 하위 호환성을 위해 유지
 * Posts 컬렉션에서만 ticker 수집 (Admin SDK)
 */
export async function getPostTickers(): Promise<string[]> {
  const tickersSet = new Set<string>();

  try {
    const postsSnapshot = await adminDb.collection('posts').get();
    postsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.ticker && typeof data.ticker === 'string') {
        tickersSet.add(data.ticker.toUpperCase().trim());
      }
    });
    console.log(`[Post Tickers] Found ${tickersSet.size} tickers from ${postsSnapshot.size} posts`);
  } catch (error) {
    console.error('[Post Tickers] Failed to fetch posts:', error);
  }

  return Array.from(tickersSet).sort();
}

/**
 * Market-call 컬렉션에서 document ID와 ticker 쌍 수집 (Admin SDK)
 * 크론이 각 market-call의 currentPrice를 업데이트하기 위해 사용
 */
export async function getMarketCallsWithTickers(): Promise<Array<{ docId: string; ticker: string }>> {
  const marketCalls: Array<{ docId: string; ticker: string }> = [];

  try {
    const marketCallSnapshot = await adminDb.collection('market-call').get();
    marketCallSnapshot.forEach((doc) => {
      const data = doc.data();
      const ticker = data.target_ticker || data.ticker; // target_ticker 또는 ticker 필드 지원
      if (ticker && typeof ticker === 'string') {
        marketCalls.push({
          docId: doc.id,
          ticker: ticker.toUpperCase().trim(),
        });
      }
    });
    console.log(`[MarketCalls with Tickers] Found ${marketCalls.length} market-calls`);
  } catch (error) {
    console.error('[MarketCalls with Tickers] Failed to fetch market-call:', error);
  }

  return marketCalls;
}

/**
 * @deprecated 하위 호환성을 위해 유지
 * Market-call 컬렉션에서만 ticker 수집 (Admin SDK)
 */
export async function getMarketCallTickers(): Promise<string[]> {
  const tickersSet = new Set<string>();

  try {
    const marketCallSnapshot = await adminDb.collection('market-call').get();
    marketCallSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.ticker && typeof data.ticker === 'string') {
        tickersSet.add(data.ticker.toUpperCase().trim());
      }
    });
    console.log(`[MarketCall Tickers] Found ${tickersSet.size} tickers from ${marketCallSnapshot.size} market-call posts`);
  } catch (error) {
    console.error('[MarketCall Tickers] Failed to fetch market-call:', error);
  }

  return Array.from(tickersSet).sort();
}

/**
 * 사용자 게시글에서 ticker 수집 (posts + market-call) (Admin SDK)
 * @deprecated 대신 getPostTickers() 또는 getMarketCallTickers() 사용
 * 하위 호환성을 위해 유지
 */
export async function getUserPostsTickers(): Promise<string[]> {
  const postTickers = await getPostTickers();
  const marketCallTickers = await getMarketCallTickers();

  const allTickers = new Set([...postTickers, ...marketCallTickers]);
  console.log(`[User Tickers] Total unique user tickers: ${allTickers.size} (${postTickers.length} posts + ${marketCallTickers.length} market-call)`);

  return Array.from(allTickers).sort();
}

/**
 * 구루 포트폴리오에서 ticker 수집 (JSON 파일에서 읽기)
 * 매일 한 번만 업데이트용 (종가)
 * @param guruName 특정 구루만 가져오기 (예: 'buffett') - 선택사항
 */
export async function getGuruTickers(guruName?: string): Promise<string[]> {
  const tickersSet = new Set<string>();

  // JSON 파일에서 구루 포트폴리오 데이터 읽기
  if (guruName) {
    // 특정 구루만 처리
    const guru = (guruPortfolioData.gurus as any)[guruName];
    if (guru) {
      guru.holdings.forEach((holding: any) => {
        if (holding.ticker) {
          tickersSet.add(holding.ticker.toUpperCase().trim());
        }
      });
      console.log(`[Guru Tickers] Found ${tickersSet.size} tickers from ${guruName} portfolio (JSON)`);
    } else {
      console.warn(`[Guru Tickers] Guru '${guruName}' not found`);
    }
  } else {
    // 전체 구루 처리
    Object.values(guruPortfolioData.gurus).forEach((guru) => {
      guru.holdings.forEach((holding) => {
        if (holding.ticker) {
          tickersSet.add(holding.ticker.toUpperCase().trim());
        }
      });
    });
    console.log(`[Guru Tickers] Found ${tickersSet.size} tickers from ${Object.keys(guruPortfolioData.gurus).length} guru portfolios (JSON)`);
  }

  return Array.from(tickersSet).sort();
}

/**
 * 모든 unique ticker 수집 (하위 호환성) (Admin SDK)
 * @deprecated 대신 getUserPostsTickers() 또는 getGuruTickers() 사용
 */
export async function getAllUniqueTickers(): Promise<string[]> {
  const userTickers = await getUserPostsTickers();
  const guruTickers = await getGuruTickers();

  const allTickers = new Set([...userTickers, ...guruTickers]);
  console.log(`[All Tickers] Total unique tickers: ${allTickers.size}`);

  return Array.from(allTickers).sort();
}
