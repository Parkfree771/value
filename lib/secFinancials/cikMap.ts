/**
 * SEC ticker → CIK 매핑 로더
 * - SEC가 공개하는 https://www.sec.gov/files/company_tickers.json (~13,000개)
 * - 24시간 메모리 캐시
 * - CIK은 10자리 zero-padded 문자열로 정규화
 */

import type { SecTickerEntry } from './types';

const SEC_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
const SEC_HEADERS = {
  'User-Agent': 'Value Analysis Platform contact@value.app',
  'Accept-Encoding': 'gzip, deflate',
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cache: {
  byTicker: Map<string, SecTickerEntry>;
  loadedAt: number;
} | null = null;

let inflight: Promise<Map<string, SecTickerEntry>> | null = null;

async function loadFresh(): Promise<Map<string, SecTickerEntry>> {
  const res = await fetch(SEC_TICKERS_URL, {
    headers: SEC_HEADERS,
    next: { revalidate: 86400, tags: ['sec-tickers'] },
  });
  if (!res.ok) throw new Error(`SEC tickers fetch failed: ${res.status}`);

  const raw = (await res.json()) as Record<string, SecTickerEntry>;
  const map = new Map<string, SecTickerEntry>();
  for (const k of Object.keys(raw)) {
    const entry = raw[k];
    if (!entry?.ticker || !entry?.cik_str) continue;
    map.set(entry.ticker.toUpperCase(), entry);
  }
  return map;
}

async function getMap(): Promise<Map<string, SecTickerEntry>> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) return cache.byTicker;

  if (inflight) return inflight;
  inflight = loadFresh()
    .then((m) => {
      cache = { byTicker: m, loadedAt: Date.now() };
      return m;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * ticker 정규화 — SEC는 클래스주를 하이픈으로 표기 (BRK-B), 다른 데이터셋은 점/언더스코어를 쓰기도 함.
 * 점/언더스코어 → 하이픈 변환을 시도.
 */
function normalizeCandidates(ticker: string): string[] {
  const t = ticker.toUpperCase().trim();
  const candidates = new Set<string>([t]);
  if (t.includes('.')) candidates.add(t.replace(/\./g, '-'));
  if (t.includes('_')) candidates.add(t.replace(/_/g, '-'));
  if (t.includes('-')) candidates.add(t.replace(/-/g, '.'));
  return [...candidates];
}

/** ticker → 10자리 패딩 CIK 문자열 ("0001045810"). 없으면 null. */
export async function getCikByTicker(ticker: string): Promise<string | null> {
  const map = await getMap();
  for (const cand of normalizeCandidates(ticker)) {
    const entry = map.get(cand);
    if (entry) return String(entry.cik_str).padStart(10, '0');
  }
  return null;
}

/** ticker로 회사 메타 (영문명 등) */
export async function getCompanyMetaByTicker(
  ticker: string,
): Promise<{ cik: string; nameEn: string } | null> {
  const map = await getMap();
  for (const cand of normalizeCandidates(ticker)) {
    const entry = map.get(cand);
    if (entry) {
      return {
        cik: String(entry.cik_str).padStart(10, '0'),
        nameEn: entry.title,
      };
    }
  }
  return null;
}
