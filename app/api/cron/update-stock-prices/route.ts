// 주식 가격 자동 업데이트 크론 작업
import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadString } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { getKISStockPrice, getKISOverseaStockPrice, detectExchange } from '@/lib/kis';
import { getKISTokenWithCache, refreshKISToken } from '@/lib/kisTokenManager';
import { getUserPostsTickers, getGuruTickers, getAllUniqueTickers } from '@/lib/dynamicTickers';
import guruPortfolioData from '@/lib/guru-portfolio-data.json';

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

    // 쿼리 파라미터 확인
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all'; // user | guru | all
    const guruName = searchParams.get('guru'); // 특정 구루만 처리 (예: buffett)
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    console.log(`[CRON] ===== Starting stock price update (type: ${type}${guruName ? `, guru: ${guruName}` : ''}) =====`);

    // 토큰 준비 (강제 갱신 또는 캐시 사용)
    if (forceRefresh) {
      console.log('[CRON] Force refreshing KIS token...');
      await refreshKISToken();
      console.log('[CRON] New token generated and cached');
    } else {
      await getKISTokenWithCache();
      console.log('[CRON] KIS token ready (cached)');
    }

    // 종목 리스트 생성 (type에 따라 분기)
    let tickers: string[] = [];

    if (type === 'user') {
      // 15분마다: 사용자 게시글 종목만 (피드, 마켓콜, 마이페이지)
      tickers = await getUserPostsTickers();
      console.log(`[CRON] Processing ${tickers.length} user post tickers (real-time)`);
    } else if (type === 'guru') {
      // 매일 06시: 구루 포트폴리오 종목만 (종가)
      // guruName이 있으면 특정 구루만, 없으면 전체 구루
      tickers = await getGuruTickers(guruName || undefined);
      const desc = guruName ? `${guruName} portfolio` : 'all guru portfolios';
      console.log(`[CRON] Processing ${tickers.length} tickers from ${desc} (daily close)`);
    } else {
      // 전체 (기본값, 하위 호환성)
      tickers = await getAllUniqueTickers();
      console.log(`[CRON] Processing ${tickers.length} total tickers (all)`);
    }

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
    const stockPricesMap = new Map<string, { price: number; currency: string }>(); // 구루 JSON용

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

        // 구루 포트폴리오 종목인 경우 stockPricesMap에 추가
        if (type === 'guru') {
          stockPricesMap.set(ticker, {
            price: priceData.price,
            currency,
          });
        }

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

    // 5. 구루 포트폴리오인 경우 Firebase Storage JSON 파일 생성 및 업로드
    if (type === 'guru' && stockPricesMap.size > 0) {
      console.log(`[CRON] Generating JSON file for ${stockPricesMap.size} guru stocks...`);

      // 5-1. JSON 파일에서 basePrice 맵 생성
      const basePriceMap = new Map<string, { basePrice: number; companyName: string }>();
      Object.values(guruPortfolioData.gurus).forEach((guru) => {
        guru.holdings.forEach((holding) => {
          basePriceMap.set(holding.ticker.toUpperCase(), {
            basePrice: holding.basePrice,
            companyName: holding.companyName,
          });
        });
      });

      // 5-2. 최종 JSON 구조 생성
      const stocksData: Record<string, any> = {};
      let calculatedCount = 0;

      stockPricesMap.forEach((currentData, ticker) => {
        const baseData = basePriceMap.get(ticker);

        if (baseData) {
          // 수익률 계산: (현재가 - 기준가) / 기준가 * 100
          const returnRate = ((currentData.price - baseData.basePrice) / baseData.basePrice) * 100;

          stocksData[ticker] = {
            ticker,
            companyName: baseData.companyName,
            basePrice: baseData.basePrice,
            currentPrice: currentData.price,
            currency: currentData.currency,
            returnRate: parseFloat(returnRate.toFixed(2)),
          };

          calculatedCount++;
        } else {
          console.warn(`[CRON] No base price found for ${ticker}`);
        }
      });

      const jsonData = {
        lastUpdated: new Date().toISOString(),
        reportDate: guruPortfolioData.reportDate, // "2025-09-30"
        totalStocks: calculatedCount,
        stocks: stocksData,
      };

      // 5-3. Firebase Storage에 업로드 (매일 덮어쓰기)
      try {
        const storageRef = ref(storage, 'guru-stock-prices.json');
        await uploadString(storageRef, JSON.stringify(jsonData, null, 2), 'raw', {
          contentType: 'application/json',
        });

        console.log(`[CRON] ✅ JSON file uploaded to Firebase Storage (${calculatedCount} stocks)`);
      } catch (uploadError) {
        console.error('[CRON] Failed to upload JSON to Firebase Storage:', uploadError);
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
