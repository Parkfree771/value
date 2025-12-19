import { GuruTrackingEvent } from './types';

export const MOCK_GURU_EVENTS: GuruTrackingEvent[] = [
  // Wallet Watch Examples (PORTFOLIO)
  {
    id: 'mock-1',
    guru_name: 'Warren Buffett',
    guru_name_kr: '워렌 버핏',
    data_type: 'PORTFOLIO',
    event_date: '2024-09-30',
    target_ticker: 'AAPL',
    badge_info: {
      label: 'TRIM',
      intensity: 'HIGH',
    },
    title: '워렌 버핏, 애플 지분 또다시 감축',
    summary: 'Q3 13F 공시에서 버크셔 해서웨이가 애플 지분을 25% 추가로 줄인 것으로 드러났습니다. 현금 보유 확대 전략의 일환으로 해석됩니다.',
    content_html: `<p>워렌 버핏이 이끄는 <strong>버크셔 해서웨이</strong>가 2024년 3분기 13F 공시를 통해 <strong>애플(AAPL) 지분을 25% 추가 매도</strong>했다는 사실이 밝혀졌습니다.</p>
    <p>이는 올해 들어 세 번째 애플 지분 감축으로, 버핏은 현재 시장 밸류에이션이 고평가되었다고 판단한 것으로 보입니다.</p>
    <p>한편 버크셔의 현금 보유액은 사상 최고치인 3,250억 달러에 육박하며, 시장 조정을 대비한 방어적 포지셔닝으로 해석됩니다.</p>`,
    tracking_data: {
      base_price_date: '2024-09-30',
      action_direction: 'SHORT',
    },
    base_price: 226.50,
    current_price: 245.30,
    return_rate: 8.31,
    views: 1245,
    likes: 89,
    created_at: '2024-11-15T09:00:00Z',
  },
  {
    id: 'mock-2',
    guru_name: 'Ray Dalio',
    guru_name_kr: '레이 달리오',
    data_type: 'PORTFOLIO',
    event_date: '2024-06-30',
    target_ticker: 'GLD',
    badge_info: {
      label: 'NEW BUY',
      intensity: 'HIGH',
    },
    title: '레이 달리오, 금 ETF 대규모 신규 매수',
    summary: '브리지워터가 금 ETF(GLD)에 12억 달러 규모의 신규 포지션을 구축했습니다. 인플레이션 헷지 전략으로 풀이됩니다.',
    content_html: `<p>세계 최대 헤지펀드 <strong>브리지워터 어소시에이츠</strong>의 창립자 레이 달리오가 <strong>금 ETF(GLD)에 12억 달러 규모의 대규모 포지션</strong>을 새로 구축했습니다.</p>
    <p>달리오는 과거부터 "현금은 쓰레기"라며 금과 같은 실물자산 투자를 강조해왔으며, 이번 매수는 그의 철학을 재확인시켜줍니다.</p>
    <p>글로벌 채무 위기와 달러 약세 우려 속에서 금 가격은 이후 15% 상승했습니다.</p>`,
    tracking_data: {
      base_price_date: '2024-06-30',
      action_direction: 'LONG',
    },
    base_price: 214.30,
    current_price: 246.50,
    return_rate: 15.02,
    views: 2156,
    likes: 178,
    created_at: '2024-08-14T10:30:00Z',
  },
  {
    id: 'mock-3',
    guru_name: 'Bill Ackman',
    guru_name_kr: '빌 애크먼',
    data_type: 'PORTFOLIO',
    event_date: '2024-03-31',
    target_ticker: 'CMG',
    badge_info: {
      label: 'ADD',
      intensity: 'MEDIUM',
    },
    title: '빌 애크먼, 치폴레 지분 추가 확대',
    summary: '퍼싱스퀘어가 치폴레(CMG) 지분을 10% 추가 매수하며 확신을 드러냈습니다. 주가는 이후 22% 상승했습니다.',
    content_html: `<p>액티비스트 투자자 <strong>빌 애크먼</strong>이 이끄는 퍼싱스퀘어 캐피탈이 <strong>치폴레 멕시칸 그릴(CMG) 지분을 10% 추가 매수</strong>했습니다.</p>
    <p>애크먼은 치폴레를 "미국 외식업계의 애플"이라고 극찬하며, 브랜드 파워와 운영 효율성을 높이 평가했습니다.</p>
    <p>이후 치폴레는 실적 서프라이즈를 기록하며 주가가 22% 급등했고, 애크먼의 안목이 다시 한 번 증명되었습니다.</p>`,
    tracking_data: {
      base_price_date: '2024-03-31',
      action_direction: 'LONG',
    },
    base_price: 2850.00,
    current_price: 3478.00,
    return_rate: 22.04,
    views: 892,
    likes: 64,
    created_at: '2024-05-16T14:20:00Z',
  },

  // Word Watch Examples (MENTION)
  {
    id: 'mock-4',
    guru_name: 'Stanley Druckenmiller',
    guru_name_kr: '스탠리 드러켄밀러',
    data_type: 'MENTION',
    event_date: '2024-10-08',
    target_ticker: 'SPY',
    badge_info: {
      label: 'WARNING',
      intensity: 'HIGH',
    },
    title: '드러켄밀러: "연준의 피벗은 너무 늦었다"',
    summary: 'CNBC 인터뷰에서 스탠리 드러켄밀러는 연준의 금리 인하 시점이 늦었다며 경기 침체 가능성을 경고했습니다.',
    content_html: `<p>전설적인 투자자 <strong>스탠리 드러켄밀러</strong>가 CNBC와의 인터뷰에서 <strong>"연준의 통화정책 전환은 이미 늦었다"</strong>고 강하게 비판했습니다.</p>
    <p>그는 "연준이 인플레이션과 싸우느라 금리를 너무 오래 높게 유지했고, 이제 경기 침체는 피할 수 없게 됐다"고 경고했습니다.</p>
    <p>드러켄밀러는 과거 2000년 닷컴 버블, 2008년 금융위기를 정확히 예측한 바 있어, 그의 발언은 시장에서 높은 주목을 받고 있습니다.</p>`,
    tracking_data: {
      base_price_date: '2024-10-08',
      action_direction: 'SHORT',
    },
    base_price: 573.20,
    current_price: 578.40,
    return_rate: 0.91,
    views: 3421,
    likes: 267,
    created_at: '2024-10-09T08:15:00Z',
  },
  {
    id: 'mock-5',
    guru_name: 'Cathie Wood',
    guru_name_kr: '캐시 우드',
    data_type: 'MENTION',
    event_date: '2024-11-12',
    target_ticker: 'TSLA',
    badge_info: {
      label: 'BULLISH',
      intensity: 'HIGH',
    },
    title: '캐시 우드: "테슬라, 2030년까지 10배 상승 가능"',
    summary: 'ARK Invest CEO 캐시 우드는 트위터를 통해 테슬라의 FSD와 로보택시 사업이 주가를 10배 끌어올릴 것이라고 전망했습니다.',
    content_html: `<p><strong>ARK Invest</strong>의 CEO <strong>캐시 우드</strong>가 자신의 X(구 트위터) 계정을 통해 <strong>"테슬라(TSLA)는 2030년까지 10배 상승할 것"</strong>이라는 파격적인 전망을 내놓았습니다.</p>
    <p>그녀는 테슬라의 완전자율주행(FSD) 기술과 로보택시 네트워크가 상용화되면, 테슬라의 가치가 자동차 회사가 아닌 "AI 플랫폼 기업"으로 재평가될 것이라고 주장했습니다.</p>
    <p>우드는 테슬라 주가가 2030년까지 주당 $2,500에 도달할 것으로 예측하며, 현재 가격은 "역사적인 매수 기회"라고 강조했습니다.</p>`,
    tracking_data: {
      base_price_date: '2024-11-12',
      action_direction: 'LONG',
    },
    base_price: 242.80,
    current_price: 268.50,
    return_rate: 10.58,
    views: 5632,
    likes: 412,
    created_at: '2024-11-13T07:45:00Z',
  },
  {
    id: 'mock-6',
    guru_name: 'Li Lu',
    guru_name_kr: '리 루',
    data_type: 'MENTION',
    event_date: '2024-09-20',
    target_ticker: 'BABA',
    badge_info: {
      label: 'BULLISH',
      intensity: 'MEDIUM',
    },
    title: '리 루: "중국 빅테크는 여전히 저평가되어 있다"',
    summary: '버핏의 멘티 리 루가 컨퍼런스에서 알리바바를 비롯한 중국 빅테크 기업들이 시장에서 과소평가되고 있다고 역설했습니다.',
    content_html: `<p>워렌 버핏의 "유일한 멘티"로 알려진 <strong>리 루</strong>가 투자 컨퍼런스에서 <strong>"중국 빅테크 기업들은 여전히 저평가되어 있다"</strong>고 강조했습니다.</p>
    <p>그는 특히 알리바바(BABA)를 언급하며, "미국 투자자들이 지정학적 리스크를 과대평가하고 있으며, 실제 사업 가치는 그보다 훨씬 크다"고 주장했습니다.</p>
    <p>리 루는 중국 정부의 규제 완화와 경기부양책이 본격화되면, 중국 주식 시장은 빠르게 회복될 것이라고 전망했습니다.</p>`,
    tracking_data: {
      base_price_date: '2024-09-20',
      action_direction: 'LONG',
    },
    base_price: 89.50,
    current_price: 104.20,
    return_rate: 16.42,
    views: 1876,
    likes: 142,
    created_at: '2024-09-21T11:30:00Z',
  },
];
