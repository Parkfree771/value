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

/**
 * 검색어 별칭 — 일반 표기 → DART 공식 등록명.
 * 사용자는 "현대차"·"포스코홀딩스"로 검색하지만 DART는 "현대자동차"·"POSCO홀딩스"로 등록.
 * 양방향으로 추가하면 어느 쪽으로 검색해도 매칭됨.
 */
const QUERY_ALIASES: Record<string, string[]> = {
  '현대차': ['현대자동차'],
  '현대자동차': ['현대차'],
  '포스코홀딩스': ['POSCO홀딩스'],
  'posco홀딩스': ['POSCO홀딩스'],
  '포스코': ['POSCO홀딩스', '포스코홀딩스'],
  '엘지': ['LG'],
  '엘지화학': ['LG화학'],
  '엘지전자': ['LG전자'],
  '엘지에너지솔루션': ['LG에너지솔루션'],
  '에스케이': ['SK'],
  'sk하이닉스': ['SK하이닉스'],
  '에스케이하이닉스': ['SK하이닉스'],
  '케이비': ['KB'],
  '케이비금융': ['KB금융'],
  '케이티': ['KT'],
  '케이티앤지': ['KT&G'],
  '하이브': ['하이브'],
  '네이버': ['NAVER'],
  'naver': ['NAVER'],
};

function expandQuery(q: string): string[] {
  const aliases = QUERY_ALIASES[q];
  if (!aliases) return [q];
  // 원래 쿼리 + 별칭들을 모두 검색 후 정렬
  return [q, ...aliases.map(a => a.toLowerCase())];
}

/** 기업 검색
 *
 * 정렬 우선순위 (점수 큰 순):
 *   1) 정확 일치 (예: "셀트리온" 검색 → "셀트리온" 본체 우선)
 *   2) 접두사 일치 ("셀트리온헬스케어", "셀트리온제약" 같은 동족 회사)
 *   3) 부분 포함 ("아이팩셀트리온닉" 같은 가운데 포함)
 *   4) 종목코드 부분 일치
 * 같은 점수 내에서는:
 *   - 상장 회사 (stockCode 존재) 우선 — 소멸/비상장 회사 회피
 *   - 이름 길이 짧은 회사 우선 — 쿼리에 더 가까움 (셀트리온 < 셀트리온헬스케어)
 *
 * 별칭 처리: 사용자가 "현대차" 입력 시 "현대자동차"도 함께 검색 (QUERY_ALIASES).
 *
 * 동기: "카카오" 검색 시 "카카오엠"(합병 소멸)이 1위로 잡혔던 버그 수정.
 */
export async function searchCorps(query: string, limit = 20): Promise<DartCorpEntry[]> {
  const index = await getCorpIndex();
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // 종목코드 정확히 매칭
  if (/^\d{6}$/.test(q)) {
    return index.filter(e => e.stockCode === q).slice(0, limit);
  }

  const queries = expandQuery(q);

  type Scored = { entry: DartCorpEntry; score: number };
  const scored = new Map<string, Scored>(); // corpCode 기준 dedupe (가장 높은 점수)

  for (const entry of index) {
    const nameLower = entry.corpName.toLowerCase();
    let bestScore = 0;

    for (const sub of queries) {
      let score = 0;
      if (nameLower === sub) score = 10000;
      else if (nameLower.startsWith(sub)) score = 1000;
      else if (nameLower.includes(sub)) score = 100;
      else if (entry.stockCode && entry.stockCode.includes(sub)) score = 50;
      else continue;
      if (score > bestScore) bestScore = score;
    }

    if (bestScore === 0) continue;

    // 상장 회사 가산점 — 합병 소멸 회사 회피
    if (entry.stockCode) bestScore += 500;

    // 이름 길이 짧을수록 가산 (셀트리온 4자 < 셀트리온헬스케어 8자)
    bestScore += Math.max(0, 50 - nameLower.length * 2);

    const prev = scored.get(entry.corpCode);
    if (!prev || prev.score < bestScore) scored.set(entry.corpCode, { entry, score: bestScore });
  }

  return [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entry);
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
