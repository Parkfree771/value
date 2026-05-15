// Guru Tracker Types

export interface GuruInfo {
  name_kr: string;
  name_en: string;
  filing_name: string; // 13F 공시 법인명
  cik: string; // SEC CIK 번호 (10자리, 앞에 0 패딩)
  style: string; // 투자 스타일
  catchphrase: string; // 캐치프레이즈
  image_filename: string; // 프로필 이미지 파일명
  /**
   * SEO 키워드 — 한국인이 그 구루를 검색할 때 함께 치는 단어들.
   * (관련 회사·동료·대표 보유종목·유명 사건 등)
   * /portfolio/[slug] 메타 키워드에 자동 병합됨.
   */
  seo_keywords?: string[];
}

export const GURU_LIST: GuruInfo[] = [
  {
    name_kr: '워렌 버핏',
    name_en: 'Warren Buffett',
    filing_name: 'Berkshire Hathaway',
    cik: '0001067983',
    style: '정통 가치투자',
    catchphrase: '살아있는 자본주의의 역사. 시간이 증명한 가치 투자의 영원한 아이콘.',
    image_filename: 'GURU/Buffett.webp',
    seo_keywords: [
      '버크셔 해서웨이', '버크셔', 'Berkshire Hathaway', 'BRK.A', 'BRK.B',
      '버핏 포트폴리오', '워렌 버핏 보유 종목', '버크셔 포트폴리오', '버핏 매수 종목',
      '찰리 멍거', 'Charlie Munger', '멍거', '버핏 멍거', '오마하의 현인',
      '버핏 Apple 비중', '버크셔 애플', '버핏 코카콜라', 'BNSF', 'GEICO',
      '주주서한', '오마하 주총', '가치투자', '복리 투자',
    ],
  },
  {
    name_kr: '스탠리 드러켄밀러',
    name_en: 'Stanley Druckenmiller',
    filing_name: 'Duquesne Family Office',
    cik: '0001536411',
    style: '공격적 성장/매크로',
    catchphrase: '30년 무패의 신화. 거시 경제의 흐름을 읽고 주도주를 선점하는 승부사.',
    image_filename: 'GURU/Druckenmiller.webp',
    seo_keywords: [
      '듀케인 패밀리오피스', 'Duquesne Family Office', 'Duquesne',
      '드러켄밀러 포트폴리오', '드러켄밀러 보유 종목', '드러켄밀러 매수',
      '조지 소로스', 'George Soros', 'Quantum Fund', '소로스 파트너',
      '영국 파운드 공매도', '블랙 웬즈데이', '매크로 트레이딩',
      '드러켄밀러 NVIDIA', '드러켄밀러 엔비디아', '30년 무패',
    ],
  },
  {
    name_kr: '빌 애크먼',
    name_en: 'Bill Ackman',
    filing_name: 'Pershing Square Capital',
    cik: '0001336528',
    style: '집중 투자',
    catchphrase: '확신이 없다면 배팅하지 않는다. 소수 정예 종목에 집중하는 행동주의 거물.',
    image_filename: 'GURU/Ackman.webp',
    seo_keywords: [
      '퍼싱 스퀘어', 'Pershing Square', 'Pershing Square Capital',
      '애크먼 포트폴리오', '빌 애크먼 보유 종목', '애크먼 매수',
      '행동주의 투자', '액티비스트', 'activist investor',
      'Howard Hughes', 'Chipotle', 'CMG', 'Universal Music', 'UMG',
      'Herbalife', '허벌라이프 공매도', '소수 종목 집중 투자',
    ],
  },
  {
    name_kr: '리 루',
    name_en: 'Li Lu',
    filing_name: 'Himalaya Capital',
    cik: '0001709323',
    style: '글로벌 가치투자',
    catchphrase: '찰리 멍거가 인정한 유일한 파트너. 동서양을 잇는 현대적 가치 투자의 정석.',
    image_filename: 'GURU/riru.webp',
    seo_keywords: [
      '히말라야 캐피털', 'Himalaya Capital', 'Himalaya',
      '리루 포트폴리오', '리 루 보유 종목', '리루 매수', 'Li Lu 13F',
      '찰리 멍거', 'Charlie Munger', '멍거의 파트너', '멍거 추천 펀드',
      'BYD', '비야디', '리루 BYD', '리루 비야디', '뱅크오브아메리카',
      '천안문 1989', '동양인 가치투자자', '글로벌 가치투자',
    ],
  },
  {
    name_kr: '세스 클라만',
    name_en: 'Seth Klarman',
    filing_name: 'The Baupost Group',
    cik: '0001061768',
    style: '절대 안전마진',
    catchphrase: '잃지 않는 투자의 미학. 남들이 외면한 저평가 자산을 찾는 안전마진의 대가.',
    image_filename: 'GURU/ses.webp',
    seo_keywords: [
      '바우포스트', 'Baupost', 'The Baupost Group',
      '클라만 포트폴리오', '세스 클라만 보유 종목',
      '안전마진', 'Margin of Safety', '안전마진 책', '클라만 책',
      '절대 수익', '가치투자 바이블', '저평가 가치주', '디스트레스',
    ],
  },
  {
    name_kr: '하워드 막스',
    name_en: 'Howard Marks',
    filing_name: 'Oaktree Capital',
    cik: '0000949509',
    style: '심층 가치/부실채권',
    catchphrase: '시장의 사이클을 지배하는 현자. 2차적 사고(Second-level thinking)로 리스크를 제어한다.',
    image_filename: 'GURU/max.webp',
    seo_keywords: [
      '오크트리', 'Oaktree', 'Oaktree Capital',
      '하워드 막스 포트폴리오', '막스 보유 종목', '오크트리 13F',
      '하워드 막스 메모', 'Howard Marks Memos', '오크트리 메모',
      '2차적 사고', 'Second-level thinking', '시장 사이클',
      '투자에 대한 생각', '부실채권', 'distressed debt', '하이일드 채권',
    ],
  },
  {
    name_kr: '칼 아이칸',
    name_en: 'Carl Icahn',
    filing_name: 'Carl C. Icahn',
    cik: '0000921669',
    style: '행동주의',
    catchphrase: '월스트리트가 두려워한 행동주의의 원조. 무능한 경영진을 흔들어 주주가치를 끌어내는 기업 사냥꾼.',
    image_filename: 'GURU/Icahn.webp',
    seo_keywords: [
      'Icahn Enterprises', 'IEP', '아이칸 엔터프라이즈',
      '아이칸 포트폴리오', '칼 아이칸 보유 종목', '아이칸 13F',
      '행동주의', '액티비스트 투자', '기업 사냥꾼', 'corporate raider',
      'TWA', '넷플릭스 아이칸', 'Netflix 아이칸', 'Apple 아이칸',
    ],
  },
  {
    name_kr: '데이비드 테퍼',
    name_en: 'David Tepper',
    filing_name: 'Appaloosa LP',
    cik: '0001656456',
    style: '디스트레스/매크로',
    catchphrase: '위기의 잿더미에서 황금을 캐는 헤지펀드의 전설. 공포가 극에 달한 순간 매수 버튼을 누르는 역발상의 대가.',
    image_filename: 'GURU/Tepper.webp',
    seo_keywords: [
      '아팔루사', 'Appaloosa', 'Appaloosa Management', 'Appaloosa LP',
      '테퍼 포트폴리오', '데이비드 테퍼 보유 종목', '테퍼 13F',
      '디스트레스드 투자', 'distressed investing', '위기 투자', '역발상 투자',
      'Carolina Panthers', '캐롤라이나 팬서스', 'NFL 구단주',
      '테퍼 중국', '테퍼 알리바바', '테퍼 BABA',
    ],
  },
  {
    name_kr: '토마스 게이너',
    name_en: 'Thomas Gayner',
    filing_name: 'Markel Group',
    cik: '0001096343',
    style: '컴파운더 가치투자',
    catchphrase: '보험 플로트로 굴러가는 미니 버크셔. 묵묵히 우량주를 모아가는 미국식 컴파운딩의 정석.',
    image_filename: 'GURU/Gayner.webp',
    seo_keywords: [
      'Markel', 'Markel Group', 'MKL', '마켈', '마켈 그룹',
      '게이너 포트폴리오', '토마스 게이너 보유 종목', '게이너 13F',
      '미니 버크셔', '보험사 컴파운더', '컴파운딩 투자',
      '게이너 인터뷰', '게이너 가치투자',
    ],
  },
];

export type DataType = 'PORTFOLIO' | 'MENTION';

// PORTFOLIO일 때: "NEW BUY", "SOLD OUT", "ADD", "TRIM"
// MENTION일 때: "BULLISH", "BEARISH", "WARNING", "OPINION", "BUY", "SELL"
export type BadgeLabel = 'NEW BUY' | 'SOLD OUT' | 'ADD' | 'TRIM' | 'BULLISH' | 'BEARISH' | 'WARNING' | 'OPINION' | 'BUY' | 'SELL';

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
  company_name?: string; // 기업명
  exchange?: string; // 상장 거래소 (NYSE, NASDAQ, etc.)
  source_url?: string; // 출처 링크
  badge_info: BadgeInfo;
  title: string; // 클릭을 유도하는 매력적인 헤드라인
  summary: string; // 메인 리스트에 노출될 2줄 요약
  content_html: string; // 본문 HTML
  tracking_data: TrackingData;
  created_at?: string; // Firestore timestamp
  views?: number;
  likes?: number;

  // 작성자 정보
  author_id?: string; // 작성자 UID
  author_email?: string; // 작성자 이메일
  author_nickname?: string; // 작성자 닉네임

  // 계산된 필드들 (프론트엔드에서 계산)
  current_price?: number;
  base_price?: number;
  return_rate?: number;

  // 주식 상세 정보
  stockData?: {
    symbol?: string;
    name?: string;
    currentPrice?: number;
    currency?: string;
    marketCap?: number;
    per?: number | null;
    pbr?: number | null;
    eps?: number | null;
    exchange?: string;
    industry?: string;
    sector?: string;
  };
}

export type TabType = 'wallet' | 'word';
