// SEC 13F 데이터 관련 타입 정의

// 13F XML에서 파싱한 원본 보유 종목 데이터
export interface Raw13FHolding {
  nameOfIssuer: string;
  titleOfClass: string;
  cusip: string;
  value: number; // 천 달러 단위 (파싱 시 x1000 변환 전)
  shares: number;
  sharesType: 'SH' | 'PRN';
  putCall?: 'PUT' | 'CALL';
  investmentDiscretion: string;
}

// Q3 vs Q4 비교 후 최종 보유 종목
export interface PortfolioHolding {
  cusip: string;
  ticker: string | null;
  name_of_issuer: string;
  title_of_class: string;
  exchange: string;

  // Q4 (현재 분기) 데이터
  value_curr: number; // 실제 USD (x1000 변환 후)
  shares_curr: number;
  weight_curr: number; // 포트폴리오 비중 % (0-100)

  // Q3 (이전 분기) 데이터
  value_prev: number | null; // NEW BUY일 경우 null
  shares_prev: number | null;
  weight_prev: number | null;

  // 비교 결과
  status: 'NEW BUY' | 'SOLD OUT' | 'ADD' | 'TRIM' | 'HOLD';
  shares_change_pct: number | null; // 주식수 변동률 (%)

  // 매핑 메타
  ticker_source: 'manual' | 'auto' | 'unmapped';

  // 가격 데이터 (스크립트로 별도 주입)
  price_at_filing?: number | null;  // 공시일 종가 (USD)
  price_current?: number | null;    // 현재가 (USD)
  price_change_pct?: number | null; // 공시일 대비 변동률 (%)
}

// data/guru-portfolios.json 구루별 포트폴리오 구조
export interface GuruPortfolioDoc {
  guru_name_en: string;
  guru_name_kr: string;
  cik: string;
  filing_name: string;
  report_date_prev: string; // "2025-09-30" (Q3 말)
  report_date_curr: string; // "2025-12-31" (Q4 말)
  filing_date_curr: string; // SEC 제출일 (예: "2025-02-14")
  total_value_prev: number; // Q3 총 포트폴리오 가치 (USD)
  total_value_curr: number; // Q4 총 포트폴리오 가치 (USD)
  holdings_count: number; // 현재 보유 종목 수
  updated_at: string; // ISO 타임스탬프
  holdings: PortfolioHolding[];
}

// CUSIP → 티커 매핑 엔트리
export interface CusipMapping {
  cusip: string;
  ticker: string;
  exchange: string;
  name: string;
  source: 'manual' | 'auto';
}

// SEC EDGAR submission 응답에서 필요한 필드
export interface EdgarFiling {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: string;
  primaryDocument: string;
}
