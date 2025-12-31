// 초기 guru-stock-prices.json 생성 및 Firebase Storage 업로드 스크립트
import 'dotenv/config';
import { adminStorage } from '../lib/firebase-admin';
import guruPortfolioData from '../lib/guru-portfolio-data.json';

async function initGuruPricesJson() {
  console.log('[Init] Creating initial guru-stock-prices.json...');

  const stocksData: Record<string, any> = {};
  let totalStocks = 0;

  // 모든 구루의 모든 종목에 대해 기준가 설정
  Object.values(guruPortfolioData.gurus).forEach((guru) => {
    guru.holdings.forEach((holding) => {
      const tickerUpper = holding.ticker.toUpperCase();

      // 이미 추가된 종목이면 스킵 (중복 제거)
      if (stocksData[tickerUpper]) {
        return;
      }

      stocksData[tickerUpper] = {
        ticker: tickerUpper,
        companyName: holding.companyName,
        exchange: (holding as any).exchange || null,
        basePrice: holding.basePrice, // 9월 30일 기준가
        currentPrice: holding.basePrice, // 초기값은 기준가와 동일
        currency: 'USD', // 기본값
        returnRate: 0, // 초기값은 0%
      };

      totalStocks++;
    });
  });

  const jsonData = {
    lastUpdated: new Date().toISOString(),
    reportDate: guruPortfolioData.reportDate,
    totalStocks: totalStocks,
    stocks: stocksData,
  };

  console.log(`[Init] Generated JSON with ${totalStocks} stocks`);

  // Firebase Storage에 업로드
  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file('guru-stock-prices.json');

    await file.save(JSON.stringify(jsonData, null, 2), {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'public, max-age=300', // 5분 캐시
      },
    });

    console.log('[Init] ✅ Successfully uploaded to Firebase Storage');
    console.log(`[Init] Total stocks: ${totalStocks}`);
    console.log(`[Init] Report date: ${guruPortfolioData.reportDate}`);

    return jsonData;
  } catch (error) {
    console.error('[Init] ✗ Upload failed:', error);
    throw error;
  }
}

// 실행
initGuruPricesJson()
  .then(() => {
    console.log('[Init] Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Init] Error:', error);
    process.exit(1);
  });
