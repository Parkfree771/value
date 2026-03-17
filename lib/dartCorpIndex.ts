/**
 * DART 기업코드 인덱스
 * public/data/dart-corps.json에서 상장기업 목록을 로드하여 검색 지원
 * (런타임 DART API 호출 불필요)
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface DartCorpEntry {
  corpCode: string;
  corpName: string;
  corpNameEng: string;
  stockCode: string;
}

interface CompactEntry {
  c: string; // corpCode
  n: string; // corpName
  s: string; // stockCode
}

let cachedIndex: DartCorpEntry[] | null = null;

/** JSON 파일에서 인덱스 로드 */
async function loadIndex(): Promise<DartCorpEntry[]> {
  const filePath = path.join(process.cwd(), 'public', 'data', 'dart-corps.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  const compact: CompactEntry[] = JSON.parse(raw);

  return compact.map(e => ({
    corpCode: e.c,
    corpName: e.n,
    corpNameEng: '',
    stockCode: e.s,
  }));
}

/** 인덱스 가져오기 (메모리 캐시) */
export async function getCorpIndex(): Promise<DartCorpEntry[]> {
  if (cachedIndex) return cachedIndex;

  console.log('[DART Corp Index] Loading from dart-corps.json...');
  cachedIndex = await loadIndex();
  console.log(`[DART Corp Index] Loaded ${cachedIndex.length} listed companies`);
  return cachedIndex;
}

/** 기업 검색 */
export async function searchCorps(query: string, limit = 20): Promise<DartCorpEntry[]> {
  const index = await getCorpIndex();
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // 종목코드 정확히 매칭
  if (/^\d{6}$/.test(q)) {
    return index.filter(e => e.stockCode === q).slice(0, limit);
  }

  // 이름 매칭: 정확히 시작하는 것 우선, 그 다음 포함
  const startsWith: DartCorpEntry[] = [];
  const contains: DartCorpEntry[] = [];

  for (const entry of index) {
    const nameLower = entry.corpName.toLowerCase();

    if (nameLower.startsWith(q)) {
      startsWith.push(entry);
    } else if (nameLower.includes(q) || entry.stockCode.includes(q)) {
      contains.push(entry);
    }
  }

  return [...startsWith, ...contains].slice(0, limit);
}

/** corp_code로 기업 찾기 */
export async function findByCorpCode(corpCode: string): Promise<DartCorpEntry | null> {
  const index = await getCorpIndex();
  return index.find(e => e.corpCode === corpCode) || null;
}

/** stock_code로 기업 찾기 */
export async function findByStockCode(stockCode: string): Promise<DartCorpEntry | null> {
  const index = await getCorpIndex();
  return index.find(e => e.stockCode === stockCode) || null;
}
