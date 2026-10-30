// public/data/global-stocks.json(약 3만 종목) 에서 한글명(nameKr) 있는 해외 종목만 뽑아
// utils/stockNameKr.json 으로 저장 — 카드에 긴 영문명 대신 한글 약칭을 보여주는 데 쓴다(클라이언트 번들용 작은 맵).
// 실행: node scripts/build-stock-name-kr.mjs  (global-stocks.json 의 nameKr 을 보강한 뒤 다시 실행)

import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('public/data/global-stocks.json', 'utf8'));
const map = {};
for (const s of data.stocks) {
  if (s.nameKr && s.country !== 'KR') map[s.symbol.toUpperCase()] = s.nameKr;
}
fs.writeFileSync('utils/stockNameKr.json', `${JSON.stringify(map, null, 0)}\n`);
console.log(`utils/stockNameKr.json  ${Object.keys(map).length}개`);
