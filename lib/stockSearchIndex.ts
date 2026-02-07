/**
 * 주식 검색 인덱스
 *
 * 프리픽스 맵 기반 O(1) 조회로 검색 성능 최적화
 * - 심볼 프리픽스 인덱스
 * - 한글 이름 프리픽스 인덱스
 * - 영문 이름 프리픽스 인덱스
 */

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

/**
 * 프리픽스 인덱스 클래스
 *
 * Trie 대신 Map 기반으로 구현하여 메모리 효율성과 조회 속도 균형
 */
class PrefixIndex {
  // prefix -> Set of stock indices
  private symbolIndex: Map<string, Set<number>> = new Map();
  private nameKrIndex: Map<string, Set<number>> = new Map();
  private nameEnIndex: Map<string, Set<number>> = new Map();

  private stocks: GlobalStock[] = [];
  private isBuilt = false;

  /**
   * 인덱스 빌드
   */
  build(stocks: GlobalStock[]): void {
    if (this.isBuilt && this.stocks.length === stocks.length) {
      return;
    }

    console.log('[StockSearchIndex] Building index for', stocks.length, 'stocks');
    const startTime = performance.now();

    this.stocks = stocks;
    this.symbolIndex.clear();
    this.nameKrIndex.clear();
    this.nameEnIndex.clear();

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];

      // 심볼 인덱싱 (모든 프리픽스)
      const symbol = stock.symbol.toLowerCase();
      this.addToIndex(this.symbolIndex, symbol, i, 4); // 최대 4글자 프리픽스

      // 한글 이름 인덱싱 (전체 + 개별 단어)
      if (stock.nameKr) {
        const nameKr = stock.nameKr.toLowerCase();
        this.addToIndex(this.nameKrIndex, nameKr, i, 4);
        for (const word of nameKr.split(/\s+/)) {
          if (word.length > 0) this.addToIndex(this.nameKrIndex, word, i, 4);
        }
      }

      // 영문 이름 인덱싱 (전체 + 개별 단어)
      const name = stock.name.toLowerCase();
      this.addToIndex(this.nameEnIndex, name, i, 4);
      for (const word of name.split(/\s+/)) {
        if (word.length > 0) this.addToIndex(this.nameEnIndex, word, i, 4);
      }
    }

    this.isBuilt = true;
    const elapsed = performance.now() - startTime;
    console.log(`[StockSearchIndex] Index built in ${elapsed.toFixed(2)}ms`);
    console.log(`[StockSearchIndex] Symbol prefixes: ${this.symbolIndex.size}`);
    console.log(`[StockSearchIndex] Korean name prefixes: ${this.nameKrIndex.size}`);
    console.log(`[StockSearchIndex] English name prefixes: ${this.nameEnIndex.size}`);
  }

  /**
   * 프리픽스 인덱스에 추가
   */
  private addToIndex(index: Map<string, Set<number>>, text: string, stockIndex: number, maxPrefixLen: number): void {
    const len = Math.min(text.length, maxPrefixLen);
    for (let i = 1; i <= len; i++) {
      const prefix = text.slice(0, i);
      let set = index.get(prefix);
      if (!set) {
        set = new Set();
        index.set(prefix, set);
      }
      set.add(stockIndex);
    }
  }

  /**
   * 검색 실행
   */
  search(query: string, limit: number = 20): Stock[] {
    if (!this.isBuilt || !query || query.length === 0) {
      return [];
    }

    const searchLower = query.toLowerCase().trim();
    if (searchLower.length === 0) {
      return [];
    }

    // 검색 프리픽스 (최대 4글자)
    const prefix = searchLower.slice(0, 4);

    // 후보 수집
    const candidates = new Set<number>();

    // 심볼 매치
    const symbolMatches = this.symbolIndex.get(prefix);
    if (symbolMatches) {
      symbolMatches.forEach(i => candidates.add(i));
    }

    // 한글 이름 매치
    const nameKrMatches = this.nameKrIndex.get(prefix);
    if (nameKrMatches) {
      nameKrMatches.forEach(i => candidates.add(i));
    }

    // 영문 이름 매치
    const nameEnMatches = this.nameEnIndex.get(prefix);
    if (nameEnMatches) {
      nameEnMatches.forEach(i => candidates.add(i));
    }

    // includes() 폴백: 프리픽스로 찾을 수 없는 복합어 내 부분 문자열 매치
    // (예: "인버스" in "코스닥150선물인버스", "레버리지" in "코스닥150레버리지")
    if (searchLower.length >= 2) {
      for (let i = 0; i < this.stocks.length; i++) {
        if (candidates.has(i)) continue;
        const stock = this.stocks[i];
        const nameKr = stock.nameKr?.toLowerCase() || '';
        const name = stock.name.toLowerCase();
        if (nameKr.includes(searchLower) || name.includes(searchLower)) {
          candidates.add(i);
        }
      }
    }

    // 후보가 없으면 빈 결과
    if (candidates.size === 0) {
      return [];
    }

    // 후보 필터링 및 정렬
    const results: { stock: GlobalStock; score: number }[] = [];
    const seenKeys = new Set<string>();

    for (const idx of candidates) {
      const stock = this.stocks[idx];
      const key = `${stock.symbol}:${stock.exchange}`;

      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      // 상세 매칭 점수 계산
      const score = this.calculateScore(stock, searchLower);
      if (score > 0) {
        results.push({ stock, score });
      }
    }

    // 점수순 정렬
    results.sort((a, b) => b.score - a.score);

    // 결과 변환
    return results.slice(0, limit).map(({ stock }) => ({
      symbol: stock.symbol,
      name: stock.name,
      nameKr: stock.nameKr || null,
      exchange: stock.exchange,
      type: stock.exchange === 'CRYPTO' ? 'CRYPTO' : 'EQUITY',
    }));
  }

  /**
   * 매칭 점수 계산
   */
  private calculateScore(stock: GlobalStock, searchLower: string): number {
    const symbolLower = stock.symbol.toLowerCase();
    const nameLower = stock.name.toLowerCase();
    const nameKrLower = stock.nameKr?.toLowerCase() || '';

    let score = 0;

    // 심볼 정확 매치 (최고 점수)
    if (symbolLower === searchLower) {
      return 1000;
    }

    // 한글 이름 정확 매치
    if (nameKrLower && nameKrLower === searchLower) {
      return 900;
    }

    // 심볼 시작 매치
    if (symbolLower.startsWith(searchLower)) {
      score = 800 - searchLower.length; // 짧은 매치가 더 정확
    }

    // 한글 이름 시작 매치
    if (nameKrLower && nameKrLower.startsWith(searchLower)) {
      score = Math.max(score, 700 - searchLower.length);
    }

    // 한글 이름 포함
    if (nameKrLower && nameKrLower.includes(searchLower)) {
      score = Math.max(score, 500);
    }

    // 영문 이름 시작 매치
    if (nameLower.startsWith(searchLower)) {
      score = Math.max(score, 600);
    }

    // 영문 이름 포함
    if (nameLower.includes(searchLower)) {
      score = Math.max(score, 400);
    }

    // 심볼 포함
    if (symbolLower.includes(searchLower)) {
      score = Math.max(score, 300);
    }

    return score;
  }

  /**
   * 인덱스가 빌드되었는지 확인
   */
  get ready(): boolean {
    return this.isBuilt;
  }

  /**
   * 인덱스된 종목 수
   */
  get size(): number {
    return this.stocks.length;
  }
}

// 싱글톤 인스턴스
export const stockSearchIndex = new PrefixIndex();

export default stockSearchIndex;
