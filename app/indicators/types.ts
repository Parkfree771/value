/** FRED API 단일 관측 데이터 */
export interface FredObservation {
  date: string;   // "YYYY-MM-DD"
  value: number;
}

/** /api/fred 응답 형식 */
export interface FredApiResponse {
  series_id: string;
  observations: FredObservation[];
  count: number;
  lastUpdated: string;
}

/** 각 지표의 정적 설정 */
export interface FredIndicatorConfig {
  seriesId: string;
  name: string;
  nameEn: string;
  description: string;
  unit: string;
  color: string;
  decimals: number;
  format?: (value: number) => string;
  /** 기준선 (예: 장단기금리차의 0%) */
  referenceLine?: { value: number; label: string; color: string; strokeWidth?: number };
  /** true이면 원본 지수 대신 전년 대비 변화율(YoY %)로 표시 */
  yoyChange?: boolean;
}

/** 기간 선택 */
export type TimeRange = '1M' | '3M' | '6M' | '1Y' | '5Y' | 'MAX';
