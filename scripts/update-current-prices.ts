// 실제 현재가 업데이트 스크립트
import 'dotenv/config';
import { adminStorage } from '../lib/firebase-admin';
import { getKISStockPrice, getKISOverseaStockPrice, detectExchange } from '../lib/kis';
import { getKISTokenWithCache } from '../lib/kisTokenManager';

async function updateCurrentPrices() {
  console.log('[Update] Starting current price update...');

  try {
    // 1. KIS 토큰 준비
    await getKISTokenWithCache();
    console.log('[Update] KIS token ready');

    // 2. Firebase Storage에서 기존 JSON 읽기
    const bucket = adminStorage.bucket();
    const file = bucket.file('guru-stock-prices.json');

    const [fileContent] = await file.download();
    const jsonData = JSON.parse(fileContent.toString());

    console.log(`[Update] Loaded ${jsonData.totalStocks} stocks from Firebase`);

    // 3. 샘플 종목으로 테스트 (AAPL, GOOGL, TSLA, AMZN, NVDA)
    const testTickers = ['AAPL', 'GOOGL', 'TSLA', 'AMZN', 'NVDA'];

    for (const ticker of testTickers) {
      try {
        const stock = jsonData.stocks[ticker];
        if (!stock) {
          console.log(`[Update] ${ticker} not found in JSON`);
          continue;
        }

        // 실제 현재가 조회
        const exchange = stock.exchange || detectExchange(ticker);
        const priceData = await getKISOverseaStockPrice(ticker, exchange);

        // 수익률 계산
        const returnRate = ((priceData.price - stock.basePrice) / stock.basePrice) * 100;

        // 업데이트
        jsonData.stocks[ticker] = {
          ...stock,
          currentPrice: priceData.price,
          currency: priceData.currency,
          returnRate: parseFloat(returnRate.toFixed(2)),
        };

        console.log(`[Update] ${ticker}: $${stock.basePrice} → $${priceData.price} (${returnRate.toFixed(2)}%)`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[Update] ${ticker} failed:`, error);
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

    console.log('[Update] ✅ Successfully updated and uploaded to Firebase Storage');
    console.log(`[Update] Last updated: ${jsonData.lastUpdated}`);

  } catch (error) {
    console.error('[Update] Error:', error);
    throw error;
  }
}

// 실행
updateCurrentPrices()
  .then(() => {
    console.log('[Update] Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Update] Failed:', error);
    process.exit(1);
  });
