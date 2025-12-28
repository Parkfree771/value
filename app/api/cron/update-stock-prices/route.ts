// 주식 가격 자동 업데이트 크론 작업
import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getKISStockPrice, getKISOverseaStockPrice, detectExchange } from '@/lib/kis';
import { getKISTokenWithCache } from '@/lib/kisTokenManager';
import { getAllUniqueTickers } from '@/lib/dynamicTickers';

const DELAY_BETWEEN_REQUESTS = 100; // ms (초당 10회 = 안전한 rate limit)

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. 보안: CRON_SECRET 검증
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || token !== process.env.CRON_SECRET) {
      console.error('[CRON] Unauthorized request attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON] ===== Starting stock price update =====');

    // 동적 ticker 리스트 생성 (posts + 구루 포트폴리오)
    const tickers = await getAllUniqueTickers();
    console.log(`[CRON] Processing ${tickers.length} unique tickers`);

    // 토큰 준비 (Firestore 캐시 사용 - serverless에서 중요!)
    await getKISTokenWithCache();
    console.log('[CRON] KIS token ready');

    if (tickers.length === 0) {
      console.warn('[CRON] No tickers found to process');
      return NextResponse.json({
        success: true,
        message: 'No tickers to process',
        tickersProcessed: 0,
        tickersSucceeded: 0,
        tickersFailed: 0,
        duration: Date.now() - startTime,
      });
    }

    // 4. 각 ticker별 가격 조회 및 Firestore 저장
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];

      try {
        console.log(`[CRON] [${i + 1}/${tickers.length}] Fetching ${ticker}...`);

        // 국내 vs 해외 판별 (6자리 숫자 = 한국)
        const isDomestic = /^\d{6}$/.test(ticker);
        let priceData;

        if (isDomestic) {
          // 국내 주식
          priceData = await getKISStockPrice(ticker);
        } else {
          // 해외 주식
          const exchange = detectExchange(ticker);
          priceData = await getKISOverseaStockPrice(ticker, exchange);
        }

        // currency 결정 (국내 = KRW, 해외 = priceData.currency 또는 USD)
        const currency = isDomestic ? 'KRW' : ((priceData as any).currency || 'USD');

        // Firestore에 개별 문서로 저장
        const docRef = doc(db, 'stock_data', ticker);
        await setDoc(docRef, {
          ticker,
          price: priceData.price,
          change: priceData.change,
          changePercent: priceData.changePercent,
          open: priceData.open,
          high: priceData.high,
          low: priceData.low,
          volume: priceData.volume,
          currency,
          isDomestic,
          lastUpdated: Timestamp.now(),
        });

        successCount++;
        console.log(`[CRON] ✓ ${ticker}: ${priceData.price} ${currency}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[CRON] ✗ Failed: ${ticker} - ${errorMsg}`);

        // 실패한 종목도 에러 정보와 함께 Firestore에 저장
        try {
          const docRef = doc(db, 'stock_data', ticker);
          await setDoc(docRef, {
            ticker,
            error: errorMsg,
            lastUpdated: Timestamp.now(),
          });
        } catch (saveError) {
          console.error(`[CRON] Failed to save error for ${ticker}:`, saveError);
        }

        failCount++;
        errors.push(`${ticker}: ${errorMsg}`);
      }

      // Rate limiting: 마지막 종목 제외하고 100ms delay
      if (i < tickers.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }
    }

    const duration = Date.now() - startTime;
    const durationSec = (duration / 1000).toFixed(2);

    console.log('[CRON] ===== Update completed =====');
    console.log(`[CRON] Duration: ${durationSec}s`);
    console.log(`[CRON] Success: ${successCount} / Failed: ${failCount}`);

    if (errors.length > 0) {
      console.log(`[CRON] Errors: ${errors.slice(0, 5).join(', ')}${errors.length > 5 ? '...' : ''}`);
    }

    return NextResponse.json({
      success: true,
      tickersProcessed: tickers.length,
      tickersSucceeded: successCount,
      tickersFailed: failCount,
      duration,
      durationSeconds: parseFloat(durationSec),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    console.error('[CRON] ===== Critical error =====');
    console.error(`[CRON] Error: ${errorMsg}`);
    console.error('[CRON] Stack:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update stock prices',
        message: errorMsg,
        duration,
      },
      { status: 500 }
    );
  }
}
