// 구루 포트폴리오 종목의 정확한 거래소 자동 탐지
import guruPortfolioData from '../lib/guru-portfolio-data.json';
import * as fs from 'fs';
import * as path from 'path';

const DELAY = 150; // ms between requests
const EXCHANGES_TO_TRY = ['NAS', 'NYS', 'AMS']; // NASDAQ, NYSE, AMEX

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testExchange(ticker: string, exchange: string): Promise<number> {
  try {
    const url = `https://warrennvalue.netlify.app/api/kis/stock?code=${ticker}&exchange=${exchange}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.success && data.data.price > 0) {
      return data.data.price;
    }
    return 0;
  } catch (error) {
    console.error(`Error testing ${ticker} on ${exchange}:`, error);
    return 0;
  }
}

async function detectExchangeForTicker(ticker: string): Promise<{ exchange: string; price: number } | null> {
  console.log(`\n[${ticker}] Testing exchanges...`);

  for (const exchange of EXCHANGES_TO_TRY) {
    console.log(`  Trying ${exchange}...`);
    const price = await testExchange(ticker, exchange);

    if (price > 0) {
      console.log(`  ✓ Found on ${exchange}: $${price}`);
      return { exchange, price };
    }

    await sleep(DELAY);
  }

  console.log(`  ✗ Not found on any exchange`);
  return null;
}

async function main() {
  console.log('========================================');
  console.log('구루 포트폴리오 거래소 자동 탐지');
  console.log('========================================\n');

  // 모든 종목 추출
  const allHoldings: Array<{ ticker: string; companyName: string; basePrice: number; shares: number; value: number }> = [];

  Object.values(guruPortfolioData.gurus).forEach((guru) => {
    guru.holdings.forEach((holding) => {
      // 중복 제거
      if (!allHoldings.find(h => h.ticker === holding.ticker)) {
        allHoldings.push(holding);
      }
    });
  });

  console.log(`Total unique tickers: ${allHoldings.length}\n`);

  // 거래소 탐지 결과 저장
  const exchangeMap = new Map<string, string>();
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < allHoldings.length; i++) {
    const holding = allHoldings[i];
    console.log(`[${i + 1}/${allHoldings.length}] ${holding.ticker} (${holding.companyName})`);

    const result = await detectExchangeForTicker(holding.ticker);

    if (result) {
      exchangeMap.set(holding.ticker, result.exchange);
      successCount++;
    } else {
      failCount++;
    }

    // Rate limiting
    if (i < allHoldings.length - 1) {
      await sleep(DELAY);
    }
  }

  console.log('\n========================================');
  console.log('결과 요약');
  console.log('========================================');
  console.log(`성공: ${successCount}개`);
  console.log(`실패: ${failCount}개`);

  // 거래소별 통계
  const exchangeStats = new Map<string, number>();
  exchangeMap.forEach((exchange) => {
    exchangeStats.set(exchange, (exchangeStats.get(exchange) || 0) + 1);
  });

  console.log('\n거래소별 분포:');
  exchangeStats.forEach((count, exchange) => {
    console.log(`  ${exchange}: ${count}개`);
  });

  // JSON 파일 업데이트
  console.log('\n========================================');
  console.log('JSON 파일 업데이트 중...');
  console.log('========================================\n');

  const updatedData = { ...guruPortfolioData };

  Object.keys(updatedData.gurus).forEach((guruKey) => {
    const guru = (updatedData.gurus as any)[guruKey];
    guru.holdings = guru.holdings.map((holding: any) => {
      const exchange = exchangeMap.get(holding.ticker);
      if (exchange) {
        return { ...holding, exchange };
      }
      return holding;
    });
  });

  // 파일 저장
  const outputPath = path.join(__dirname, '../lib/guru-portfolio-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(updatedData, null, 2), 'utf-8');

  console.log(`✓ Updated: ${outputPath}`);
  console.log(`\n거래소 정보가 ${successCount}개 종목에 추가되었습니다.`);

  // 실패한 종목 리스트
  if (failCount > 0) {
    console.log('\n⚠️  다음 종목들은 거래소를 찾지 못했습니다:');
    allHoldings.forEach((holding) => {
      if (!exchangeMap.has(holding.ticker)) {
        console.log(`  - ${holding.ticker} (${holding.companyName})`);
      }
    });
  }
}

main().catch(console.error);
