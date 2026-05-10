/**
 * SEC EDGAR XBRL companyfacts API 타입
 */

export interface SecFactUnit {
  end: string;        // 보고 기간 종료일 "2024-12-31"
  val: number;        // 값 (USD)
  accn: string;       // accession number
  fy: number;         // fiscal year
  fp: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY';
  form: '10-K' | '10-Q' | '20-F' | '40-F' | '10-K/A' | '10-Q/A' | string;
  filed: string;      // filing date
  frame?: string;     // CY2024Q4 등
  start?: string;     // 기간 시작 (CF/IS만)
}

export interface SecFact {
  label?: string;
  description?: string;
  units: Record<string, SecFactUnit[]>; // 'USD', 'shares', 'pure' 등
}

export interface SecCompanyFacts {
  cik: number;
  entityName: string;
  facts: {
    'us-gaap'?: Record<string, SecFact>;
    'ifrs-full'?: Record<string, SecFact>;
    dei?: Record<string, SecFact>;
  };
}

/** SEC ticker→CIK 매핑 원본 (sec.gov/files/company_tickers.json) */
export interface SecTickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

/** 검색 결과 */
export interface SecSearchResult {
  ticker: string;
  nameEn: string;
  nameKr?: string;
  exchange: 'NAS' | 'NYS';
  cik?: string;       // 10자리 패딩
}
