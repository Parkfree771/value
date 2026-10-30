/**
 * 종목 검색 인덱스 — 글쓰기 종목 검색(클라이언트)과 /api/stocks/search(서버)가 같은 규칙을 쓴다.
 *
 * 찾는 방법
 * - 공백·대소문자·기호 무시: "삼성 전자" = "삼성전자", "SK 하이닉스" = "sk하이닉스", "brk.b" = "BRK/B"
 * - 한글명·영문명·티커의 앞부분·단어 시작·중간 포함
 * - 초성: "ㅅㅅㅈㅈ" → 삼성전자
 * - 별칭·다른 표기 (lib/stockAliases.ts): "하닉", "현대자동차", "도요타", "코덱스200"
 *
 * 순위
 * - 정확히 일치 > 앞부분 일치 > 단어 시작 > 중간 포함 순의 점수
 * - 같은 점수대에서는 대형주·인기 종목 가산(POPULAR_BOOST), 우선주·레버리지/인버스·테마 ETF 감점
 *   (질의에 그 단어가 있으면 감점하지 않음)
 *
 * 3만 종목을 미리 정규화해 두고 매번 훑는다 — 한 번에 수 ms.
 */

import { STOCK_ALIASES, POPULAR_BOOST, QUERY_REWRITES } from './stockAliases';

export interface GlobalStock {
  symbol: string;
  name: string;
  exchange: string;
  country: string;
  nameKr?: string;
}

export interface Stock {
  symbol: string;
  name: string;
  nameKr?: string | null;
  exchange: string;
  type: string;
}

interface Entry {
  stock: GlobalStock;
  key: string;
  sym: string;
  kr: string;
  en: string;
  enWords: string[];
  cho: string;
  aliases: string[];
  boost: number;
  isPreferred: boolean;
  isLeveraged: boolean;
  isFund: boolean;
}

/** 소문자 + 공백·기호 제거 (한글·영문·숫자만 남김) */
export function normalizeQuery(s: string): string {
  return s.toLowerCase().replace(/[^0-9a-z가-힣ㄱ-ㅎ]/g, '');
}

const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

/** 한글 음절 → 초성, 그 외 문자는 그대로 */
function toChosung(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0) - 0xac00;
    out += code >= 0 && code < 11172 ? CHO[Math.floor(code / 588)] : ch;
  }
  return out;
}

const PREFERRED = /우[b-c]?$|[0-9]우[b-c]?$/; // 삼성전자우, 현대차2우B (정규화 후 소문자)
const LEVERAGED = /레버리지|인버스|선물|2x|3x|bull|bear|ultra|채권혼합|커버드콜/;
const FUND_BRAND = /^(kodex|tiger|ace|rise|sol|kiwoom|plus|arirang|hanaro|kbstar|koact|timefolio|heroes|unicorn|1q|bnk|woori|itf|마이다스|에셋플러스|파워|trex|direxion|proshares|ishares|spdr|invesco|vanguard|granite|kurv|defiance|tradr|leverage)/;

class StockSearchIndex {
  private entries: Entry[] = [];
  private builtFor = 0;

  build(stocks: GlobalStock[]): void {
    if (this.builtFor === stocks.length && this.entries.length > 0) return;
    const seen = new Set<string>();
    this.entries = [];
    for (const stock of stocks) {
      const key = `${stock.symbol}:${stock.exchange}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const kr = normalizeQuery(stock.nameKr || '');
      const enRaw = stock.name.toLowerCase();
      const en = normalizeQuery(enRaw);
      const display = kr || en;
      this.entries.push({
        stock,
        key,
        sym: normalizeQuery(stock.symbol),
        kr,
        en,
        enWords: enRaw.split(/[^0-9a-z]+/).filter(Boolean),
        cho: toChosung(kr),
        aliases: (STOCK_ALIASES[key] ?? []).map(normalizeQuery),
        boost: POPULAR_BOOST[key] ?? 0,
        isPreferred: stock.country === 'KR' && PREFERRED.test(kr),
        isLeveraged: LEVERAGED.test(display) || LEVERAGED.test(enRaw),
        isFund: FUND_BRAND.test(display),
      });
    }
    this.builtFor = stocks.length;
  }

  get ready(): boolean {
    return this.entries.length > 0;
  }

  get size(): number {
    return this.entries.length;
  }

  search(query: string, limit = 20): Stock[] {
    const q = normalizeQuery(query);
    if (!q || !this.ready) return [];

    // 질의 변형 — 한글 ETF 브랜드 등을 영문 표기로
    const variants = [q];
    for (const [ko, en] of QUERY_REWRITES) {
      if (q.startsWith(ko)) variants.push(en + q.slice(ko.length));
    }
    const isChosung = /^[ㄱ-ㅎ]+$/.test(q);
    // 질의 자체에 들어 있으면 감점하지 않는다 ("삼성전자우", "kodex 레버리지")
    const wantsPreferred = /우[b-c]?$/.test(q);
    const wantsLeveraged = LEVERAGED.test(q);
    const wantsFund = variants.some((v) => FUND_BRAND.test(v));

    const scored: { e: Entry; score: number }[] = [];
    for (const e of this.entries) {
      let base = 0;
      for (const v of variants) base = Math.max(base, this.matchScore(e, v, isChosung));
      if (base === 0) continue;

      let score = base + e.boost;
      if (e.isPreferred && !wantsPreferred) score -= 40;
      if (e.isLeveraged && !wantsLeveraged) score -= 35;
      if (e.isFund && !wantsFund) score -= 25;
      // 이름이 질의에 가까울수록(짧을수록) 조금 위로
      score -= Math.min(20, Math.max(0, (e.kr || e.en).length - q.length));
      scored.push({ e, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(({ e }) => ({
      symbol: e.stock.symbol,
      name: e.stock.name,
      nameKr: e.stock.nameKr || null,
      exchange: e.stock.exchange,
      type: 'EQUITY',
    }));
  }

  /** 일치 정도 점수 (0 = 불일치). 점수대 사이 간격(100)이 가산·감점보다 커서 단계가 뒤집히지 않는다 */
  private matchScore(e: Entry, q: string, isChosung: boolean): number {
    if (isChosung) {
      if (!e.cho) return 0;
      if (e.cho === q) return 700;
      if (e.cho.startsWith(q)) return 600;
      return e.cho.includes(q) ? 400 : 0;
    }
    if (e.sym === q) return 1000;
    if (e.kr === q || e.aliases.includes(q)) return 950;
    if (e.en === q) return 900;
    if (e.kr.startsWith(q)) return 800;
    if (e.aliases.some((a) => a.startsWith(q))) return 780;
    if (e.sym.startsWith(q)) return 760;
    if (e.en.startsWith(q)) return 700;
    if (q.length >= 2 && e.enWords.some((w) => w.startsWith(q))) return 600;
    if (q.length >= 2 && e.kr.includes(q)) return 550;
    if (q.length >= 3 && e.en.includes(q)) return 400;
    if (q.length >= 2 && e.aliases.some((a) => a.includes(q))) return 380;
    return 0;
  }
}

export const stockSearchIndex = new StockSearchIndex();

export default stockSearchIndex;
