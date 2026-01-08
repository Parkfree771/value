/**
 * tickers 컬렉션 관리 헬퍼
 *
 * posts, market-call 등에서 사용하는 ticker를 중앙 관리
 * GitHub Actions에서 이 컬렉션만 읽어서 가격 업데이트 (비용 절감)
 */

import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const TICKERS_COLLECTION = 'tickers';

interface TickerData {
  ticker: string;
  exchange: string;
  postCount: number;
  createdAt: any;
  lastUsedAt: any;
}

/**
 * ticker 등록 또는 카운트 증가
 * 게시물 작성 시 호출
 */
export async function registerTicker(ticker: string, exchange: string): Promise<void> {
  if (!ticker || !exchange) {
    console.warn('[Tickers] ticker or exchange is empty');
    return;
  }

  const tickerUpper = ticker.toUpperCase().trim();
  const tickerRef = doc(db, TICKERS_COLLECTION, tickerUpper);

  try {
    const tickerDoc = await getDoc(tickerRef);

    if (tickerDoc.exists()) {
      // 이미 존재하면 카운트 증가
      await updateDoc(tickerRef, {
        postCount: increment(1),
        lastUsedAt: serverTimestamp(),
      });
      console.log(`[Tickers] ${tickerUpper} count incremented`);
    } else {
      // 새로 등록
      await setDoc(tickerRef, {
        ticker: tickerUpper,
        exchange: exchange.toUpperCase().trim(),
        postCount: 1,
        createdAt: serverTimestamp(),
        lastUsedAt: serverTimestamp(),
      });
      console.log(`[Tickers] ${tickerUpper} registered`);
    }
  } catch (error) {
    console.error('[Tickers] Failed to register ticker:', error);
    // 실패해도 게시물 작성은 계속 진행
  }
}

/**
 * ticker 카운트 감소
 * 게시물 삭제 시 호출
 */
export async function unregisterTicker(ticker: string): Promise<void> {
  if (!ticker) return;

  const tickerUpper = ticker.toUpperCase().trim();
  const tickerRef = doc(db, TICKERS_COLLECTION, tickerUpper);

  try {
    const tickerDoc = await getDoc(tickerRef);

    if (tickerDoc.exists()) {
      const data = tickerDoc.data() as TickerData;

      if (data.postCount <= 1) {
        // 마지막 게시물이면 문서 유지 (나중에 다시 사용할 수 있으므로)
        await updateDoc(tickerRef, {
          postCount: 0,
          lastUsedAt: serverTimestamp(),
        });
      } else {
        // 카운트 감소
        await updateDoc(tickerRef, {
          postCount: increment(-1),
          lastUsedAt: serverTimestamp(),
        });
      }
      console.log(`[Tickers] ${tickerUpper} count decremented`);
    }
  } catch (error) {
    console.error('[Tickers] Failed to unregister ticker:', error);
  }
}
