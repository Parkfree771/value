/** DART 기업 개요 */
export interface DartCompanyInfo {
  corp_code: string;
  corp_name: string;
  corp_name_eng: string;
  stock_code: string;
  ceo_nm: string;
  corp_cls: string;
  adres: string;
  hm_url: string;
  ir_url: string;
  induty_code: string;
  est_dt: string;
  acc_mt: string;
}

/** DART 재무제표 원시 항목 */
export interface DartFinancialRaw {
  rcept_no: string;
  bsns_year: string;
  corp_code: string;
  stock_code: string;
  reprt_code: string;
  account_nm: string;
  fs_div: string;
  sj_div: string;
  thstrm_nm: string;
  thstrm_amount: string;
  frmtrm_nm: string;
  frmtrm_amount: string;
  bfefrmtrm_nm: string;
  bfefrmtrm_amount: string;
}

/** 파싱된 재무 데이터 (차트용) */
export interface FinancialMetrics {
  period: string;
  year: number;
  quarter?: number;
  // 손익
  revenue: number | null;          // 매출액 (억원)
  operatingProfit: number | null;  // 영업이익 (억원)
  netIncome: number | null;        // 당기순이익 (억원)
  // 마진
  operatingMargin: number | null;  // 영업이익률 (%)
  netMargin: number | null;        // 순이익률 (%)
  // 성장
  revenueGrowth: number | null;    // 매출 성장률 (%)
  profitGrowth: number | null;     // 영업이익 성장률 (%)
  // 재무상태
  totalAssets: number | null;      // 자산총계 (억원)
  totalLiabilities: number | null; // 부채총계 (억원)
  totalEquity: number | null;      // 자본총계 (억원)
  currentAssets: number | null;    // 유동자산 (억원)
  currentLiabilities: number | null; // 유동부채 (억원)
  // 비율
  debtRatio: number | null;        // 부채비율 (%)
  currentRatio: number | null;     // 유동비율 (%)
  roe: number | null;              // ROE (%)
  roa: number | null;              // ROA (%)
  // 현금흐름
  operatingCashFlow: number | null;   // 영업활동 현금흐름 (억원)
  investingCashFlow: number | null;   // 투자활동 현금흐름 (억원)
  financingCashFlow: number | null;   // 재무활동 현금흐름 (억원)
  freeCashFlow: number | null;        // 잉여현금흐름 (억원)
  // 주주환원 + 현금잔액 + 차입금 (US/SEC만 지원, KR DART는 null)
  dividendsPaid: number | null;       // 배당 지급액 (양수, 백만USD)
  stockBuyback: number | null;        // 자사주 매입 (양수, 백만USD)
  cashBalance: number | null;         // 현금성자산 기말 잔액 (백만USD)
  longTermDebt: number | null;        // 이자성 차입금 기말 잔액 (백만USD)
  // 주주환원 탭 전용 (US/SEC만, KR null)
  shareBasedComp: number | null;      // 주식기반보상 비용 SBC (백만USD)
  sharesOutstanding: number | null;   // 발행주식수 기말 잔량 (주, 환율 변환 불가)
  epsBasic: number | null;            // 주당순이익 기본 (USD/주)
  epsDiluted: number | null;          // 주당순이익 희석 (USD/주)
}

/** 검색 결과 기업 */
export interface SearchResult {
  corpCode: string;
  corpName: string;
  stockCode: string;
  count?: number;
}

/** 주식 실시간 정보 (KIS) */
export interface StockProfile {
  currentPrice: number;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  high52w: number | null;
  low52w: number | null;
  volume: number;
}

/** API 응답 */
export interface DartFinancialResponse {
  corp_code: string;
  metrics: FinancialMetrics[];
  lastUpdated: string;
}

/** 주식분할 이벤트 — SEC 분할 공시 또는 검증 안 된 점프 알림 */
export interface SplitEvent {
  /** SEC 보고 기준 분할 효력일 'YYYY-MM-DD'. unverified는 점프 발생 연도-01-01. */
  effectiveDate: string;
  /** 분할 비율. 10 = 10:1 정방향, 0.1 = 1:10 역방향. unverified는 관측 비율. */
  ratio: number;
  /** 시계열 중 어느 기간에 보정 적용됐는지 (UI 표기용). */
  appliedAtPeriod: string | null;
  /**
   * 검출 출처:
   *  - 'sec': SEC 분할 태그 기반. 정수 비율로 발행주식수·EPS 보정 적용.
   *  - 'unverified': 발행주식수 ≥2배 점프 발견했지만 SEC 분할 공시 없음.
   *    보정 미적용, UI에서 사용자에게 검증 요청 (유상증자·합병·SPAC 등 가능).
   */
  source: 'sec' | 'unverified';
}

/** 보기 모드 */
export type ViewMode = 'annual' | 'quarterly';

/** 분석 탭 */
export type AnalysisTab = 'performance' | 'cashflow' | 'stability' | 'shareholder' | 'interest';

/** Google Trends 데이터 포인트 */
export interface TrendPoint {
  date: string;
  timestamp: number;
  value: number;
}

/** Trends 통합 응답 */
export interface TrendsResponse {
  keyword: string;
  keywordEn: string;
  period: string;
  google: {
    global: TrendPoint[];  // 영문 키워드, 전 세계
    korea: TrendPoint[];   // 한국어 키워드, 한국
  };
  naver: TrendPoint[];     // 네이버 데이터랩
}
