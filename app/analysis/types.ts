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

/** 보기 모드 */
export type ViewMode = 'annual' | 'quarterly';

/** 분석 탭 */
export type AnalysisTab = 'performance' | 'profitability' | 'stability' | 'cashflow' | 'interest';

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
