// 전체 구루 종목 현재가 업데이트 스크립트
import 'dotenv/config';
import { adminStorage } from '../lib/firebase-admin';
import { getKISStockPrice, getKISOverseaStockPrice, detectExchange } from '../lib/kis';
import { getKISTokenWithCache } from '../lib/kisTokenManager';

const DELAY_BETWEEN_REQUESTS = 100; // ms

async function updateAllGuruPrices() {
  console.log('[Update All] Starting full price update for all 222 stocks...');

  try {
    // 1. KIS 토큰 준비
    await getKISTokenWithCache();
    console.log('[Update All] KIS token ready');

    // 2. Firebase Storage에서 기존 JSON 읽기
    const bucket = adminStorage.bucket();
    const file = bucket.file('guru-stock-prices.json');

    const [fileContent] = await file.download();
    const jsonData = JSON.parse(fileContent.toString());

    console.log(`[Update All] Loaded ${jsonData.totalStocks} stocks from Firebase`);

    // 3. 모든 종목 업데이트
    const tickers = Object.keys(jsonData.stocks);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];

      try {
        const stock = jsonData.stocks[ticker];

        // 실제 현재가 조회
        const isDomestic = /^\d{6}$/.test(ticker);
        let priceData;

        if (isDomestic) {
          priceData = await getKISStockPrice(ticker);
        } else {
          const exchange = stock.exchange || detectExchange(ticker);
          priceData = await getKISOverseaStockPrice(ticker, exchange);
        }

        const currentPrice = priceData.price;
        const currency = isDomestic ? 'KRW' : ((priceData as any).currency || 'USD');

        // 수익률 계산
        const returnRate = ((currentPrice - stock.basePrice) / stock.basePrice) * 100;

        // 업데이트
        jsonData.stocks[ticker] = {
          ...stock,
          currentPrice: currentPrice,
          currency: currency,
          returnRate: parseFloat(returnRate.toFixed(2)),
        };

        successCount++;
        console.log(`[${i + 1}/${tickers.length}] ✓ ${ticker}: $${stock.basePrice} → $${currentPrice} (${returnRate.toFixed(2)}%)`);

        // Rate limiting
        if (i < tickers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
        }
      } catch (error) {
        failCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${ticker}: ${errorMsg}`);
        console.error(`[${i + 1}/${tickers.length}] ✗ ${ticker} failed: ${errorMsg}`);
      }
    }

    // 4. JSON 업데이트
    jsonData.lastUpdated = new Date().toISOString();

    // 5. Firebase Storage에 업로드
    await file.save(JSON.stringify(jsonData, null, 2), {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'public, max-age=300',
      },
    });

    console.log('[Update All] ✅ Successfully updated and uploaded to Firebase Storage');
    console.log(`[Update All] Success: ${successCount}, Failed: ${failCount}, Total: ${tickers.length}`);
    console.log(`[Update All] Last updated: ${jsonData.lastUpdated}`);

    if (errors.length > 0) {
      console.log(`[Update All] Errors: ${errors.slice(0, 5).join(', ')}${errors.length > 5 ? ` +${errors.length - 5} more` : ''}`);
    }

  } catch (error) {
    console.error('[Update All] Error:', error);
    throw error;
  }
}

// 실행
updateAllGuruPrices()
  .then(() => {
    console.log('[Update All] Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Update All] Failed:', error);
    process.exit(1);
  });
