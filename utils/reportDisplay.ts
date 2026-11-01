// 피드 카드 / TOP10 카드 공용 표시 헬퍼
import stockNameKr from './stockNameKr.json';

/** 작성일(YYYY-MM-DD 또는 ISO)로부터 경과 일수. 파싱 실패 시 null */
export function daysSince(createdAt: string): number | null {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  if (isNaN(created.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000));
}

/** "D+153" — 작성 당일은 "D-day" */
export function heldDaysLabel(createdAt: string): string | null {
  const days = daysSince(createdAt);
  if (days === null) return null;
  return days === 0 ? 'D-day' : `D+${days.toLocaleString('ko-KR')}`;
}

/**
 * 미국 ADR/ETF 원문 종목명의 군더더기 제거
 *   "FUTU HOLDINGS LIMITED SPON ADS EACH REP 8 ORD SHS CL A" → "FUTU HOLDINGS LIMITED"
 *   "PROSHARES TRUST II ULTA BLOMBERG CRUD OIL(POST REV SPLT)" → "PROSHARES TRUST II ULTA BLOMBERG CRUD OIL"
 */
export function cleanStockName(name: string): string {
  if (!name) return '';
  const cleaned = name
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*\([^)]*$/, '') // 원문이 잘려 닫는 괄호가 없는 경우 "…BEAR 3X SHS (R"
    .replace(/\s+(SPON(SORED)?|ADS|ADR|EACH REP|ORD SHS|AMERICAN DEPOSITARY)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || name;
}

// 법인 형태·ETF 운용사 상투어 — 약칭에서 뺀다
const CORP_SUFFIX = /\b(INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|LTD|LIMITED|PLC|SA|NV|AG|LLC|LP|HOLDINGS?|GROUP|CL\s?[A-C]|CLASS\s?[A-C]|COM|SHS|UNIT|SER\s?\d+)\b\.?/gi;
const ETF_BOILERPLATE = /\b(DIREXION SHARES ETF TRUST|PROSHARES TRUST II|PROSHARES|T-REX|INVESCO|ISHARES TRUST|SPDR|DAILY|TARGET|SHARES|TRUST|FUND)\b/gi;

/** 약어로 보고 대문자 그대로 둘 단어: 숫자 포함(3X), 로마 숫자(II), 모음 없는 단어(MSTR, QQQ), 알려진 약어 */
const KEEP_UPPER = new Set(['ETF', 'ETN', 'USA', 'AI', 'S&P', 'JP', 'UK', 'EU']);
const isAcronym = (w: string) =>
  /\d/.test(w) || /^[IVX]+$/.test(w) || !/[AEIOU]/.test(w) || KEEP_UPPER.has(w);

/** 영문 대문자 이름 → Title Case ("NATERA" → "Natera", 약어는 유지) */
function titleCase(s: string): string {
  return s
    .split(' ')
    .map((w) => (w === w.toUpperCase() && !isAcronym(w) ? w[0] + w.slice(1).toLowerCase() : w))
    .join(' ');
}

/** 홈 1면 종목 표기 — 영문 티커는 티커(MU), 숫자 티커(한국·일본·홍콩)는 종목명(SK하이닉스) */
export function stockLabel(name: string, ticker: string): string {
  return /[A-Za-z]/.test(ticker) ? ticker.toUpperCase() : shortStockName(name, ticker);
}

/**
 * 카드용 짧은 종목명 — 말줄임(…) 대신 알아볼 수 있는 약칭
 *   1. 한글 약칭이 있는 해외 종목: MU → "마이크론", BABA → "알리바바"
 *   2. 없으면 영문에서 군더더기 제거 + Title Case:
 *      "NATERA INC" → "Natera", "FUTU HOLDINGS LIMITED SPON ADS…" → "Futu",
 *      "T-REX 2X INVERSE MSTR DAILY TARGET ETF" → "2X Inverse MSTR ETF"
 *   3. 한국 종목(한글 이름)은 그대로
 */
export function shortStockName(name: string, ticker?: string): string {
  const kr = ticker ? (stockNameKr as Record<string, string>)[ticker.toUpperCase()] : undefined;
  if (kr) return kr;
  if (!name || /[가-힣]/.test(name)) return name;
  const base = cleanStockName(name);
  const stripped = base.replace(ETF_BOILERPLATE, ' ').replace(CORP_SUFFIX, ' ').replace(/[,.]/g, ' ').replace(/\s+/g, ' ').replace(/[\s&-]+$/, '').trim();
  return titleCase(stripped || base);
}

// 거래소 코드 → 화면 표시 (KIS 코드 기준. 한국은 KRX 로만 저장돼 코스피/코스닥 구분 불가)
const EXCHANGE_LABEL: Record<string, string> = {
  NAS: 'NASDAQ',
  NYS: 'NYSE',
  AMS: 'AMEX',
  KRX: 'KRX',
  TSE: '도쿄',
  HKS: '홍콩',
  SHS: '상하이',
  SZS: '선전',
};

export function exchangeLabel(code?: string | null): string | null {
  if (!code) return null;
  return EXCHANGE_LABEL[code.toUpperCase()] ?? code.toUpperCase();
}

// next/image 로 최적화 가능한 호스트만 썸네일로 사용 (next.config.ts remotePatterns 와 동기화)
// — 외부 블로그(pstatic 등) 핫링크는 차단·만료가 잦고, 미등록 호스트는 next/image 가 에러를 던짐
const THUMBNAIL_HOST = /^https:\/\/([a-z0-9-]+\.)*(neon\.tech|firebasestorage\.googleapis\.com)\//i;

export function usableThumbnail(url: string | null | undefined): string | null {
  return url && THUMBNAIL_HOST.test(url) ? url : null;
}
