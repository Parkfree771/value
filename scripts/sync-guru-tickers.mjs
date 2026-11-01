// data/guru-portfolios.json 의 tickers → settings.guru_tickers 동기화.
// 구루 가격 크론(cron/update-guru-prices.mjs)이 이 목록만 조회하므로, 13F 분기 갱신 때마다 실행한다.
//
//   node --env-file=.env.local scripts/sync-guru-tickers.mjs

import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const { tickers } = JSON.parse(readFileSync(new URL('../data/guru-portfolios.json', import.meta.url), 'utf-8'));
if (!Array.isArray(tickers) || tickers.length === 0) throw new Error('tickers 없음');

const sql = neon(process.env.DATABASE_URL);
const [before] = await sql`select value from settings where key = 'guru_tickers'`;
await sql`update settings set value = ${JSON.stringify(tickers)}::jsonb where key = 'guru_tickers'`;
const [after] = await sql`select jsonb_array_length(value) as n from settings where key = 'guru_tickers'`;
console.log(`guru_tickers: ${before?.value?.length ?? 0} → ${after.n}개`);
