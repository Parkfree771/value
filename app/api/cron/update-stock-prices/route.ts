// 주식 가격 자동 업데이트 크론 작업
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage, Timestamp } from '@/lib/firebase-admin';
import { getKISStockPrice, getKISOverseaStockPrice, detectExchange } from '@/lib/kis';
import { getKISTokenWithCache, refreshKISToken } from '@/lib/kisTokenManager';
import { getUserPostsTickers, getPostTickers, getMarketCallTickers, getGuruTickers, getAllUniqueTickers } from '@/lib/dynamicTickers';
import guruPortfolioData from '@/lib/guru-portfolio-data.json';

// Netlify Functions 타임아웃 설정 (무료 플랜 최대: 26초)
export const maxDuration = 26;

const DELAY_BETWEEN_REQUESTS = 50; // ms (초당 20회 = KIS API limit)

async function handleRequest(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. 보안: Netlify Scheduled Function 또는 CRON_SECRET 검증
    const isNetlifyScheduled = request.headers.get('x-nf-event') === 'scheduled';
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const secretParam = request.nextUrl.searchParams.get('secret');

    // Netlify scheduled function이거나, Authorization 헤더나 query param으로 secret이 일치하는 경우 허용
    if (!isNetlifyScheduled && token !== process.env.CRON_SECRET && secretParam !== process.env.CRON_SECRET) {
      console.error('[CRON] Unauthorized request attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 쿼리 파라미터 확인
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all'; // post | marketcall | guru | user(deprecated) | all
    const guruName = searchParams.get('guru'); // 특정 구루만 처리 (예: buffett)
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    const batch = searchParams.get('batch'); // 1 = 앞 절반, 2 = 뒤 절반 (종목 많은 구루용)

    console.log(`[CRON] ===== Starting stock price update (type: ${type}${guruName ? `, guru: ${guruName}` : ''}${batch ? `, batch: ${batch}` : ''}) =====`);

    // 토큰 준비 (강제 갱신 또는 캐시 사용)
    if (forceRefresh) {
      await refreshKISToken();
      console.log('[CRON] Token refreshed');
    } else {
      await getKISTokenWithCache();
    }

    // 종목 리스트 생성 (type에 따라 분기)
    let tickers: string[] = [];
    let collectionName = 'stock_data'; // 기본 컬렉션 (하위 호환성)

    if (type === 'post') {
      // 15분마다: Posts 게시글 종목만 → post_prices 컬렉션에 저장
      tickers = await getPostTickers();
      collectionName = 'post_prices';
      console.log(`[CRON] Processing ${tickers.length} post tickers → ${collectionName}`);
    } else if (type === 'marketcall') {
      // 15분마다: Market-call 게시글 종목만 → marketcall_prices 컬렉션에 저장
      tickers = await getMarketCallTickers();
      collectionName = 'marketcall_prices';
      console.log(`[CRON] Processing ${tickers.length} market-call tickers → ${collectionName}`);
    } else if (type === 'user') {
      // @deprecated: 하위 호환성 (posts + market-call 모두)
      tickers = await getUserPostsTickers();
      collectionName = 'stock_data';
      console.log(`[CRON] Processing ${tickers.length} user post tickers (deprecated - use type=post or type=marketcall)`);
    } else if (type === 'guru') {
      // 매일 06시: 구루 포트폴리오 종목만 (종가) → guru-stock-prices.json으로 저장
      // guruName이 있으면 특정 구루만, 없으면 전체 구루
      tickers = await getGuruTickers(guruName || undefined);
      collectionName = 'stock_data'; // 구루는 JSON 파일로 저장하지만 일단 컬렉션명 유지
      const desc = guruName ? `${guruName} portfolio` : 'all guru portfolios';
      console.log(`[CRON] Processing ${tickers.length} tickers from ${desc} (daily close)`);
    } else {
      // 전체 (기본값, 하위 호환성)
      tickers = await getAllUniqueTickers();
      collectionName = 'stock_data';
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

    // batch 파라미터로 종목 분할 (종목 많은 구루용: buffett, howard_marks, ray_dalio, stanley_druckenmiller)
    const totalTickers = tickers.length;
    if (batch) {
      const half = Math.ceil(tickers.length / 2);
      if (batch === '1') {
        tickers = tickers.slice(0, half);
        console.log(`[CRON] Batch 1/2: Processing first ${tickers.length}/${totalTickers} tickers`);
      } else if (batch === '2') {
        tickers = tickers.slice(half);
        console.log(`[CRON] Batch 2/2: Processing last ${tickers.length}/${totalTickers} tickers`);
      }
    }

    // 4. 구루 포트폴리오인 경우 미리 데이터 맵 생성 (성능 최적화)
    let exchangeMap: Map<string, string> | null = null;
    let basePriceMap: Map<string, { basePrice: number; companyName: string }> | null = null;

    if (type === 'guru') {
      // 거래소 맵 생성 (O(1) 조회)
      exchangeMap = new Map();
      basePriceMap = new Map();

      Object.values(guruPortfolioData.gurus).forEach((guru) => {
        guru.holdings.forEach((holding) => {
          const tickerUpper = holding.ticker.toUpperCase();
          if ((holding as any).exchange) {
            exchangeMap!.set(tickerUpper, (holding as any).exchange);
          }
          basePriceMap!.set(tickerUpper, {
            basePrice: holding.basePrice,
            companyName: holding.companyName,
          });
        });
      });
    }

    // 5. 각 ticker별 가격 조회 및 Firestore 저장
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    const stockPricesMap = new Map<string, { price: number; currency: string }>(); // 구루 JSON용

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];

      try {
        // 국내 vs 해외 판별 (6자리 숫자 = 한국)
        const isDomestic = /^\d{6}$/.test(ticker);
        let priceData;

        if (isDomestic) {
          priceData = await getKISStockPrice(ticker);
        } else {
          const exchange = exchangeMap?.get(ticker) || detectExchange(ticker);
          priceData = await getKISOverseaStockPrice(ticker, exchange);
        }

        const currency = isDomestic ? 'KRW' : ((priceData as any).currency || 'USD');

        // 구루 포트폴리오는 JSON 파일만 생성 (DB 저장 안 함)
        if (type === 'guru') {
          // JSON용 데이터만 수집
          stockPricesMap.set(ticker, { price: priceData.price, currency });
        } else {
          // Posts/Market-call은 Firestore에 저장 (Admin SDK 사용)
          await adminDb.collection(collectionName).doc(ticker).set({
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
        }

        successCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[CRON] ✗ Failed: ${ticker} - ${errorMsg}`);

        // 구루가 아닌 경우에만 실패한 종목을 Firestore에 저장 (Admin SDK 사용)
        if (type !== 'guru') {
          try {
            await adminDb.collection(collectionName).doc(ticker).set({
              ticker,
              error: errorMsg,
              lastUpdated: Timestamp.now(),
            });
          } catch (saveError) {
            console.error(`[CRON] Failed to save error for ${ticker}:`, saveError);
          }
        }

        failCount++;
        errors.push(`${ticker}: ${errorMsg}`);
      }

      // Rate limiting: 마지막 종목 제외하고 100ms delay
      if (i < tickers.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }
    }

    // 6. 구루 포트폴리오인 경우 Firebase Storage JSON 파일 생성 및 업로드
    if (type === 'guru' && stockPricesMap.size > 0 && basePriceMap) {
      const stocksData: Record<string, any> = {};
      let calculatedCount = 0;

      stockPricesMap.forEach((currentData, ticker) => {
        const baseData = basePriceMap!.get(ticker);

        if (baseData) {
          // 수익률 계산: (현재가 - 기준가) / 기준가 * 100
          const returnRate = ((currentData.price - baseData.basePrice) / baseData.basePrice) * 100;

          stocksData[ticker] = {
            ticker,
            companyName: baseData.companyName,
            exchange: exchangeMap?.get(ticker) || null,
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
        reportDate: guruPortfolioData.reportDate,
        totalStocks: calculatedCount,
        stocks: stocksData,
      };

      // Firebase Storage에 업로드 (매일 덮어쓰기, Admin SDK 사용)
      try {
        const bucket = adminStorage.bucket();
        const file = bucket.file('guru-stock-prices.json');
        await file.save(JSON.stringify(jsonData, null, 2), {
          contentType: 'application/json',
          metadata: {
            cacheControl: 'public, max-age=300', // 5분 캐시
          },
        });
        console.log(`[CRON] ✅ JSON uploaded: ${calculatedCount} stocks`);
      } catch (uploadError) {
        console.error('[CRON] ✗ JSON upload failed:', uploadError);
      }
    }

    const duration = Date.now() - startTime;
    const durationSec = (duration / 1000).toFixed(2);

    console.log(`[CRON] ✓ Completed: ${successCount} success, ${failCount} failed (${durationSec}s)`);
    if (errors.length > 0) {
      console.log(`[CRON] Errors: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? ` +${errors.length - 3} more` : ''}`);
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

// GET 메서드 (Netlify Scheduled Functions용)
export async function GET(request: NextRequest) {
  return handleRequest(request);
}

// POST 메서드 (수동 호출용)
export async function POST(request: NextRequest) {
  return handleRequest(request);
}
