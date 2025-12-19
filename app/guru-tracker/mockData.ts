import { GuruTrackingEvent } from './types';

/**
 * ========================================
 * WORD WATCH 글 자동 추가 가이드
 * ========================================
 *
 * 사용자가 "리포트_작성양식.txt"를 채워서 전달하면
 * 클로드가 아래 규칙에 따라 자동으로 추가합니다.
 *
 * 📝 처리 규칙:
 * 1. ID: 마지막 ID + 1 증가
 * 2. 매수 → action_direction: 'LONG', label: 'BUY'
 * 3. 매도 → action_direction: 'SHORT', label: 'SELL'
 * 4. 본문: 요약 기반으로 HTML 작성 (3섹션 구조)
 * 5. intensity: 기본값 'HIGH'
 *
 * 🔄 수익률 계산:
 * - LONG: (현재가 - 기준가) / 기준가 × 100
 * - SHORT: (기준가 - 현재가) / 기준가 × 100
 *
 * 📌 템플릿:
 * {
 *   id: 'mock-[N]',
 *   guru_name: '[영문 이름]',
 *   guru_name_kr: '[영문 소속]',
 *   data_type: 'MENTION',
 *   event_date: '[yyyy-mm-dd]',
 *   target_ticker: '[티커]',
 *   company_name: '[기업명]',
 *   exchange: '[NYSE/NASDAQ]',
 *   source_url: '[URL]',
 *   badge_info: {
 *     label: 'BUY', // 또는 'SELL'
 *     intensity: 'HIGH',
 *   },
 *   title: '[제목]',
 *   summary: '[요약]',
 *   content_html: `[HTML]`,
 *   tracking_data: {
 *     base_price_date: '[yyyy-mm-dd]',
 *     action_direction: 'LONG', // 또는 'SHORT'
 *   },
 *   base_price: [가격],
 *   current_price: [가격],
 *   return_rate: 0,
 *   views: 0,
 *   likes: 0,
 *   created_at: '[ISO UTC]',
 * },
 */

export const MOCK_GURU_EVENTS: GuruTrackingEvent[] = [
  {
    id: 'mock-7',
    guru_name: 'David Swartz',
    guru_name_kr: 'Senior Equity Analyst, Morningstar',
    data_type: 'MENTION',
    event_date: '2025-12-19',
    target_ticker: 'NKE',
    company_name: 'Nike, Inc.',
    exchange: 'NYSE',
    source_url: 'https://finance.yahoo.com/video/nike-analyst-expects-strong-next-213852720.html',
    badge_info: {
      label: 'BUY',
      intensity: 'HIGH',
    },
    title: '나이키(NKE): 브랜드 고전 딛고 향후 2년 강력한 성장 전망',
    summary: '모닝스타의 데이비드 스워츠 분석가는 나이키가 2026 회계연도 2분기 실적에서 예상치를 상회하며 브랜드 반등 신호를 보였다고 분석했습니다.',
    content_html: `
      <h3>1. 2026 회계연도 2분기 실적 발표 (예상치 상회)</h3>
      <p>나이키가 월가의 예상을 깨고 양호한 실적을 발표했습니다.</p>
      <ul>
        <li><strong>조정 주당순이익(EPS):</strong> $0.53 (시장 예상을 웃돎)</li>
        <li><strong>매출(Revenue):</strong> $124.3억 달러 (약 17조 원)</li>
        <li>시장 예상치 $122.4억 달러를 상회</li>
      </ul>

      <h3>2. 분석가 전망 (모닝스타 - David Swartz)</h3>
      <p><strong>모닝스타(Morningstar)</strong>의 선임 주식 분석가인 <strong>데이비드 스워츠(David Swartz)</strong>는 이번 실적 발표에 대해 다음과 같이 분석했습니다.</p>
      <ul>
        <li><strong>브랜드 반등:</strong> 나이키가 그동안의 브랜드 정체와 고전을 겪었지만, 이제 회복세에 접어들었다고 평가했습니다.</li>
        <li><strong>향후 2년 전망:</strong> 2026년과 2027년 회계연도에 <strong>강력한 성장(Strong performance)</strong>이 기대된다고 내다봤습니다.</li>
      </ul>

      <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
        * 출처: Morningstar 분석 리포트<br/>
        * 분석가: David Swartz (Senior Equity Analyst)
      </p>
    `,
    tracking_data: {
      base_price_date: '2025-12-19',
      action_direction: 'LONG',
    },
    base_price: 65.63, // 글 작성 당시 나이키 주가
    current_price: 65.63,
    return_rate: 0,
    views: 12,
    likes: 3,
    created_at: '2025-12-18T21:38:00Z', // Fri, December 19, 2025 at 6:38 AM GMT+9
  },
  {
    id: 'mock-9',
    guru_name: 'Michael Burry',
    guru_name_kr: 'Scion Asset Management',
    data_type: 'MENTION',
    event_date: '2025-11-21',
    target_ticker: 'NVDA',
    company_name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    source_url: 'https://x.com/michaeljburry',
    badge_info: {
      label: 'SELL',
      intensity: 'MEDIUM',
    },
    title: '소프트웨어 마진의 종말과 감가상각의 역습',
    summary: '마이클 버리는 AI 붐으로 인해 소프트웨어 기업들이 하드웨어(GPU)를 대량 구매하며 \'항공사\'처럼 자본집약적(Capex heavy)인 사업 구조로 변질되었다고 지적함. 3~4년이면 가치가 사라지는 GPU의 빠른 감가상각이 향후 기업들의 순이익을 갉아먹을 것이라며, 현재의 높은 이익률은 지속 불가능하다고 경고.',
    content_html: `
      <h3>1. 소프트웨어 산업의 구조 변화</h3>
      <p><strong>마이클 버리(Michael Burry)</strong>는 AI 붐으로 인해 소프트웨어 기업들이 근본적으로 변질되고 있다고 지적했습니다.</p>
      <ul>
        <li><strong>하드웨어 의존도 급증:</strong> AI를 위해 GPU를 대량으로 구매하며 자본집약적 사업으로 전환</li>
        <li><strong>항공사와 유사한 구조:</strong> 높은 고정자산 투자로 인해 마진 구조가 악화</li>
        <li><strong>소프트웨어 마진 신화의 붕괴:</strong> 전통적인 높은 마진율 유지 불가능</li>
      </ul>

      <h3>2. 감가상각의 역습</h3>
      <p>버리는 GPU의 빠른 진부화가 기업들의 재무제표를 강타할 것이라고 경고했습니다.</p>
      <ul>
        <li><strong>GPU 수명:</strong> 3~4년이면 가치가 거의 사라짐</li>
        <li><strong>빠른 감가상각:</strong> 향후 몇 년간 기업들의 순이익을 크게 잠식</li>
        <li><strong>현재 이익률의 함정:</strong> 감가상각이 본격화되면 수익성 급락 불가피</li>
      </ul>

      <h3>3. 투자 시사점</h3>
      <p>버리는 현재의 높은 밸류에이션이 지속 불가능하다고 판단하고 있습니다.</p>
      <ul>
        <li><strong>Big Tech의 위험:</strong> 대규모 GPU 투자를 진행한 기업들 주의</li>
        <li><strong>NVIDIA 포함:</strong> GPU 제조사도 수요 둔화와 경쟁 심화 리스크</li>
        <li><strong>회계적 관점:</strong> 감가상각 비용이 실적을 왜곡할 가능성</li>
      </ul>

      <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
        * 출처: Michael Burry X (Twitter) 계정<br/>
        * 투자자: Michael Burry (Scion Asset Management)
      </p>
    `,
    tracking_data: {
      base_price_date: '2025-11-21',
      action_direction: 'SHORT',
    },
    base_price: 182.40,
    current_price: 182.40,
    return_rate: 0,
    views: 0,
    likes: 0,
    created_at: '2025-11-21T14:15:00Z',
  },
];
