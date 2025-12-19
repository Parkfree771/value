// Guru Tracker Types

export interface GuruInfo {
  name_kr: string;
  name_en: string;
  filing_name: string; // 13F 공시 법인명
  style: string; // 투자 스타일
  catchphrase: string; // 캐치프레이즈
  image_filename: string; // 프로필 이미지 파일명
}

export const GURU_LIST: GuruInfo[] = [
  {
    name_kr: '워렌 버핏',
    name_en: 'Warren Buffett',
    filing_name: 'Berkshire Hathaway',
    style: '정통 가치투자',
    catchphrase: '설명이 필요 없는 투자의 신, 자본주의의 역사.',
    image_filename: 'buffett.webp'
  },
  {
    name_kr: '스탠리 드러켄밀러',
    name_en: 'Stanley Druckenmiller',
    filing_name: 'Duquesne Family Office',
    style: '공격적 성장/매크로',
    catchphrase: '30년간 무패 신화, 시장의 주도주를 가장 빨리 낚아채는 승부사.',
    image_filename: 'Druckenmiller.webp'
  },
  {
    name_kr: '빌 애크먼',
    name_en: 'Bill Ackman',
    filing_name: 'Pershing Square Capital',
    style: '집중 투자',
    catchphrase: '확신이 없다면 사지 않는다. 단 8~10개 종목에 인생을 거는 전략.',
    image_filename: 'ackman.webp'
  },
  {
    name_kr: '리 루',
    name_en: 'Li Lu',
    filing_name: 'Himalaya Capital',
    style: '글로벌 가치투자',
    catchphrase: '찰리 멍거가 유일하게 돈을 맡긴 남자, 버핏의 투자 철학을 잇는 후계자.',
    image_filename: 'riru.png'
  },
  {
    name_kr: '세스 클라만',
    name_en: 'Seth Klarman',
    filing_name: 'The Baupost Group',
    style: '절대 안전마진',
    catchphrase: '잃지 않는 것이 버는 것이다. 극도로 보수적인 저평가 사냥꾼.',
    image_filename: 'ses.jpg'
  },
  {
    name_kr: '하워드 막스',
    name_en: 'Howard Marks',
    filing_name: 'Oaktree Capital',
    style: '심층 가치/부실채권',
    catchphrase: '시장의 사이클을 읽는 현자. 남들이 공포에 떨 때 기회를 줍는다.',
    image_filename: 'max.jpg'
  },
  {
    name_kr: '레이 달리오',
    name_en: 'Ray Dalio',
    filing_name: 'Bridgewater Associates',
    style: '자산 배분',
    catchphrase: '경제의 사계절을 대비한다. 어떤 위기에도 무너지지 않는 올웨더 전략.',
    image_filename: 'rai.webp'
  },
];

export type DataType = 'PORTFOLIO' | 'MENTION';

// PORTFOLIO일 때: "NEW BUY", "SOLD OUT", "ADD", "TRIM"
// MENTION일 때: "BULLISH", "BEARISH", "WARNING", "OPINION"
export type BadgeLabel = 'NEW BUY' | 'SOLD OUT' | 'ADD' | 'TRIM' | 'BULLISH' | 'BEARISH' | 'WARNING' | 'OPINION';

export type BadgeIntensity = 'HIGH' | 'MEDIUM' | 'LOW';

export type ActionDirection = 'LONG' | 'SHORT';

export interface BadgeInfo {
  label: BadgeLabel;
  intensity: BadgeIntensity;
}

export interface TrackingData {
  base_price_date: string; // YYYY-MM-DD
  action_direction: ActionDirection; // LONG(매수/상승예측) 또는 SHORT(매도/하락예측)
}

export interface GuruTrackingEvent {
  id?: string; // Firestore document ID
  guru_name: string; // English name
  guru_name_kr: string; // Korean name
  data_type: DataType; // PORTFOLIO or MENTION
  event_date: string; // YYYY-MM-DD
  target_ticker: string | null; // 관련 종목 티커
  badge_info: BadgeInfo;
  title: string; // 클릭을 유도하는 매력적인 헤드라인
  summary: string; // 메인 리스트에 노출될 2줄 요약
  content_html: string; // 본문 HTML
  tracking_data: TrackingData;
  created_at?: string; // Firestore timestamp
  views?: number;
  likes?: number;

  // 계산된 필드들 (프론트엔드에서 계산)
  current_price?: number;
  base_price?: number;
  return_rate?: number;
}

export type TabType = 'wallet' | 'word';

// Portfolio Holdings Types
export interface PortfolioHolding {
  ticker: string;
  companyName: string;
  portfolioPercent: number;
  recentActivity?: string;
  shares: number;
  reportedPrice: number;
  value: number;
  currentPrice: number;
  changeFromReported: number;
  week52Low: number;
  week52High: number;
}

export interface GuruPortfolio {
  guruNameEn: string;
  guruNameKr: string;
  reportDate: string;
  filingDate: string;
  totalValue: number;
  holdings: PortfolioHolding[];
}
