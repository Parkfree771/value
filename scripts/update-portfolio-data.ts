// portfolioData.ts에 reportedPrice 추가하는 스크립트
import * as fs from 'fs';
import * as path from 'path';

interface PriceResult {
  ticker: string;
  exchange: string;
  exchangeName: string;
  price: number | null;
  error?: string;
}

// 가격 결과 읽기
const pricesPath = path.join(__dirname, 'guru-prices-result.json');
const prices: PriceResult[] = JSON.parse(fs.readFileSync(pricesPath, 'utf-8'));

// 티커별 가격 맵 생성
const priceMap = new Map<string, number>();
for (const p of prices) {
  if (p.price !== null) {
    priceMap.set(p.ticker, p.price);
  }
}

// portfolioData.ts 읽기
const portfolioPath = path.join(__dirname, '..', 'app', 'guru-tracker', 'portfolioData.ts');
let content = fs.readFileSync(portfolioPath, 'utf-8');

let updatedCount = 0;

// 각 holding 블록을 찾아서 수정
// 패턴: { ticker: 'XXX', ... week52High: YYY, } 또는 { ticker: 'XXX', ... week52High: YYY, reportedPrice: ZZZ, }
const holdingBlockPattern = /\{\s*\n\s*ticker:\s*['"]([^'"]+)['"][\s\S]*?week52High:\s*[\d.]+,(\s*reportedPrice:\s*[\d.]+,)?(\s*\})/g;

content = content.replace(holdingBlockPattern, (match, ticker, existingReportedPrice, closing) => {
  // 이미 reportedPrice가 있으면 스킵
  if (existingReportedPrice) {
    return match;
  }

  const price = priceMap.get(ticker);
  if (!price) {
    return match;
  }

  updatedCount++;
  console.log(`✓ ${ticker}: $${price}`);

  // week52High: XXX, 다음에 reportedPrice 추가
  return match.replace(
    /(week52High:\s*[\d.]+,)(\s*\})/,
    `$1\n      reportedPrice: ${price},$2`
  );
});

// 파일 저장
fs.writeFileSync(portfolioPath, content);

console.log('\n=== 완료 ===');
console.log(`업데이트: ${updatedCount}개`);
