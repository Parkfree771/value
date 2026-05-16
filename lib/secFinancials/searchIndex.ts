/**
 * 미국주식 검색 인덱스
 * - public/data/global-stocks.json에서 NAS+NYS 종목만 추출 (~7800개)
 * - ticker / nameEn / nameKr 검색 지원
 * - 메모리 캐시
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { SecSearchResult } from './types';

interface GlobalStock {
  symbol: string;
  name: string;
  exchange: string;
  country: string;
  nameKr?: string;
}

interface GlobalStocksFile {
  stocks: GlobalStock[];
}

let cache: SecSearchResult[] | null = null;

async function loadIndex(): Promise<SecSearchResult[]> {
  const filePath = path.join(process.cwd(), 'public', 'data', 'global-stocks.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  const data: GlobalStocksFile = JSON.parse(raw);
  return data.stocks
    .filter((s) => s.exchange === 'NAS' || s.exchange === 'NYS')
    .map((s) => ({
      ticker: s.symbol,
      nameEn: s.name,
      nameKr: s.nameKr,
      exchange: s.exchange as 'NAS' | 'NYS',
    }));
}

async function getIndex(): Promise<SecSearchResult[]> {
  if (cache) return cache;
  cache = await loadIndex();
  return cache;
}

/**
 * ticker / 영문명 / 한글명으로 prefix 매칭 검색
 * - ticker 정확매칭 1순위
 * - prefix 매칭 2순위
 * - 부분 포함 3순위
 * - 한글명 있는 것 우선
 */
export async function searchUsStocks(query: string, limit = 15): Promise<SecSearchResult[]> {
  const index = await getIndex();
  const q = query.trim();
  if (!q) return [];

  const qUpper = q.toUpperCase();
  const qLower = q.toLowerCase();

  const exactTicker: SecSearchResult[] = [];
  const prefixTicker: SecSearchResult[] = [];
  const prefixNameKr: SecSearchResult[] = [];
  const prefixNameEn: SecSearchResult[] = [];
  const containsName: SecSearchResult[] = [];

  for (const s of index) {
    if (s.ticker === qUpper) {
      exactTicker.push(s);
      continue;
    }
    if (s.ticker.startsWith(qUpper)) {
      prefixTicker.push(s);
      continue;
    }
    if (s.nameKr && s.nameKr.startsWith(q)) {
      prefixNameKr.push(s);
      continue;
    }
    if (s.nameEn.toLowerCase().startsWith(qLower)) {
      prefixNameEn.push(s);
      continue;
    }
    if (
      (s.nameKr && s.nameKr.includes(q)) ||
      s.nameEn.toLowerCase().includes(qLower)
    ) {
      containsName.push(s);
    }
  }

  // ticker 정확매칭 우선, prefix 그룹 내에서는 한글명 가진 것 위로
  const byKrFirst = (arr: SecSearchResult[]) =>
    [...arr].sort((a, b) => Number(!!b.nameKr) - Number(!!a.nameKr));

  const ordered = [
    ...exactTicker,
    ...byKrFirst(prefixTicker),
    ...byKrFirst(prefixNameKr),
    ...byKrFirst(prefixNameEn),
    ...byKrFirst(containsName),
  ];

  // 중복 제거 (ticker 기준)
  const seen = new Set<string>();
  const result: SecSearchResult[] = [];
  for (const s of ordered) {
    if (seen.has(s.ticker)) continue;
    seen.add(s.ticker);
    result.push(s);
    if (result.length >= limit) break;
  }
  return result;
}

