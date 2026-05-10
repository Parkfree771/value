/**
 * SEC EDGAR companyfacts API
 *
 * https://data.sec.gov/api/xbrl/companyfacts/CIK{10자리}.json
 *
 * 응답: 회사의 모든 XBRL 태그 × 모든 기간의 시계열 (3~6MB JSON)
 * 한 회사 = 1콜로 평생치 데이터 확보.
 *
 * 캐싱 전략:
 * - Next.js fetch revalidate는 사용 안 함 (응답이 2MB 한도 초과로 항상 실패)
 * - 인플라이트 dedup: 같은 CIK에 대한 동시 요청은 하나의 fetch로 합치기
 * - 결과 캐시는 호출자(/api/sec/financial)가 담당 (CIK 단위 6h)
 */

import type { SecCompanyFacts } from './types';

const SEC_HEADERS = {
  'User-Agent': 'Value Analysis Platform contact@value.app',
  'Accept-Encoding': 'gzip, deflate',
};

/** CIK은 10자리 zero-padded. 호출 직전에 한 번 더 보정. */
function padCik(cik: string): string {
  return cik.replace(/^0+/, '').padStart(10, '0');
}

/** 인플라이트 dedup — 같은 CIK 동시 요청은 하나의 SEC fetch로 합침 */
const inflight = new Map<string, Promise<SecCompanyFacts | null>>();

async function doFetch(padded: string): Promise<SecCompanyFacts | null> {
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${padded}.json`;
  try {
    // cache: 'no-store' — Next.js 자동 캐싱 시도 회피 (응답 >2MB라 어차피 실패하고 경고만 발생)
    const res = await fetch(url, { headers: SEC_HEADERS, cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`SEC companyfacts ${res.status}`);
    }
    return (await res.json()) as SecCompanyFacts;
  } catch (e) {
    console.error('[SEC] companyfacts fetch error', e);
    return null;
  }
}

export async function fetchCompanyFacts(cik: string): Promise<SecCompanyFacts | null> {
  const padded = padCik(cik);
  const existing = inflight.get(padded);
  if (existing) return existing;

  const promise = doFetch(padded).finally(() => {
    inflight.delete(padded);
  });
  inflight.set(padded, promise);
  return promise;
}
