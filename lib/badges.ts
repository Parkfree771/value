// 배지·업적 시스템
// 작성자의 게시글 통계를 기반으로 조건 충족 시 자동 해금되는 배지.
// 해금 여부는 저장하지 않고 매번 통계에서 계산 (단일 출처 = 글 통계).
// users 문서의 equippedBadgeId 필드에 장착한 1개 배지 ID만 저장.

export type BadgeCategory = 'activity' | 'profit' | 'inverse' | 'special';

export interface UserStats {
  totalReports: number;
  avgReturnRate: number;
  maxReturnRate: number;
  minReturnRate: number;
  winRate: number;              // 0-100
  totalViews: number;
  totalLikes: number;
  shortPositions: number;       // positionType='short' + 인버스 ETF 매수 (effective short)
  shortAvgReturnRate: number;
  uniqueTickers: number;
  cryptoCount: number;          // exchange='CRYPTO' 글 수
}

// 인버스 ETF: 매수해도 사실상 시장 하락에 베팅하는 종목.
// 일반 종목 매도(positionType='short')와 의미적으로 동치 → 통계에서 합산.
const INVERSE_ETF_TICKERS = new Set<string>([
  // 미국
  'SQQQ', 'PSQ', 'QID',          // 나스닥 인버스
  'SH', 'SDS', 'SPXU', 'SPXS',   // S&P500 인버스
  'DOG', 'DXD',                  // 다우 인버스
  'TZA', 'TWM',                  // 러셀2000 인버스
  'SOXS',                        // 반도체 인버스
  'FAZ',                         // 금융 인버스
  'SCO',                         // 원유 인버스
  'TBT', 'TMV',                  // 채권 인버스
  // 한국
  '252670',                      // KODEX 200선물 인버스 2X
  '233160',                      // TIGER 코스닥150 선물 인버스
  '114800',                      // KODEX 인버스
  '139660',                      // KODEX 200선물 인버스
]);

export function isInverseEtf(ticker?: string | null): boolean {
  if (!ticker) return false;
  return INVERSE_ETF_TICKERS.has(ticker.toUpperCase().trim());
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  condition: (s: UserStats) => boolean;
}

// 모든 배지 정의. 추가는 여기서만.
export const BADGES: BadgeDef[] = [
  // ─── 활동 (글 수) ───
  {
    id: 'posts-1',
    name: '첫걸음',
    description: '첫 리포트 작성',
    category: 'activity',
    condition: (s) => s.totalReports >= 1,
  },
  {
    id: 'posts-5',
    name: '입문 분석가',
    description: '리포트 5개 작성',
    category: 'activity',
    condition: (s) => s.totalReports >= 5,
  },
  {
    id: 'posts-20',
    name: '꾸준한 분석가',
    description: '리포트 20개 작성',
    category: 'activity',
    condition: (s) => s.totalReports >= 20,
  },
  {
    id: 'posts-50',
    name: '베테랑 분석가',
    description: '리포트 50개 작성',
    category: 'activity',
    condition: (s) => s.totalReports >= 50,
  },
  {
    id: 'posts-100',
    name: '분석가의 길',
    description: '리포트 100개 작성',
    category: 'activity',
    condition: (s) => s.totalReports >= 100,
  },

  // ─── 수익 (롱 포지션) ───
  {
    id: 'alpha-30',
    name: '알파 헌터',
    description: '평균 수익률 +30% (글 5개+)',
    category: 'profit',
    condition: (s) => s.avgReturnRate >= 30 && s.totalReports >= 5,
  },
  {
    id: 'jackpot-100',
    name: '잭팟',
    description: '단일 글 +100% 이상',
    category: 'profit',
    condition: (s) => s.maxReturnRate >= 100,
  },
  {
    id: 'winrate-70',
    name: '승부사',
    description: '승률 70%↑ (글 10개+)',
    category: 'profit',
    condition: (s) => s.winRate >= 70 && s.totalReports >= 10,
  },

  // ─── 인버스 (숏 포지션·역방향) ───
  {
    id: 'bear-shy',
    name: '역방향 시도자',
    description: '숏·인버스 글 1개+',
    category: 'inverse',
    condition: (s) => s.shortPositions >= 1,
  },
  {
    id: 'short-master',
    name: '인버스 마스터',
    description: '숏·인버스 글 5개+',
    category: 'inverse',
    condition: (s) => s.shortPositions >= 5,
  },
  {
    id: 'bear-alpha',
    name: '베어 알파',
    description: '숏·인버스 평균 수익률 +20% (3개+)',
    category: 'inverse',
    condition: (s) => s.shortAvgReturnRate >= 20 && s.shortPositions >= 3,
  },
  {
    id: 'drawdown',
    name: '진솔한 패배',
    description: '단일 글 -30% 이하',
    category: 'inverse',
    condition: (s) => s.minReturnRate <= -30,
  },

  // ─── 특수 ───
  {
    id: 'crypto-pioneer',
    name: '크립토 작가',
    description: '크립토 리포트 1개+',
    category: 'special',
    condition: (s) => s.cryptoCount >= 1,
  },
  {
    id: 'views-10k',
    name: '화제의 작가',
    description: '총 조회수 10,000',
    category: 'special',
    condition: (s) => s.totalViews >= 10000,
  },
  {
    id: 'variety-10',
    name: '잡식 투자자',
    description: '서로 다른 종목 10개+',
    category: 'special',
    condition: (s) => s.uniqueTickers >= 10,
  },
];

export const BADGES_BY_ID: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.id, b])
);

export const CATEGORY_LABEL: Record<BadgeCategory, string> = {
  activity: '활동',
  profit: '수익',
  inverse: '인버스',
  special: '특수',
};

export interface PostForStats {
  returnRate?: number;
  views?: number;
  likes?: number;
  positionType?: 'long' | 'short' | string;
  ticker?: string;
  stockName?: string;
  exchange?: string;
}

export function calculateUserStats(posts: PostForStats[]): UserStats {
  const total = posts.length;
  if (total === 0) {
    return {
      totalReports: 0,
      avgReturnRate: 0,
      maxReturnRate: 0,
      minReturnRate: 0,
      winRate: 0,
      totalViews: 0,
      totalLikes: 0,
      shortPositions: 0,
      shortAvgReturnRate: 0,
      uniqueTickers: 0,
      cryptoCount: 0,
    };
  }

  const returns = posts.map((p) => p.returnRate ?? 0);
  // effective short: positionType='short' 이거나 인버스 ETF 매수.
  // 인버스 ETF는 long으로 박혀있어도 의미적으로는 하락 베팅이므로 합산.
  const shorts = posts.filter(
    (p) => p.positionType === 'short' || isInverseEtf(p.ticker)
  );
  const shortReturns = shorts.map((p) => p.returnRate ?? 0);
  const wins = returns.filter((r) => r > 0).length;
  const tickers = new Set(
    posts.map((p) => (p.ticker || p.stockName || '').toUpperCase().trim()).filter(Boolean)
  );
  const cryptoCount = posts.filter((p) => (p.exchange || '').toUpperCase() === 'CRYPTO').length;

  return {
    totalReports: total,
    avgReturnRate: returns.reduce((a, b) => a + b, 0) / total,
    maxReturnRate: Math.max(...returns),
    minReturnRate: Math.min(...returns),
    winRate: (wins / total) * 100,
    totalViews: posts.reduce((a, p) => a + (p.views ?? 0), 0),
    totalLikes: posts.reduce((a, p) => a + (p.likes ?? 0), 0),
    shortPositions: shorts.length,
    shortAvgReturnRate:
      shorts.length > 0 ? shortReturns.reduce((a, b) => a + b, 0) / shorts.length : 0,
    uniqueTickers: tickers.size,
    cryptoCount,
  };
}

export function getUnlockedBadgeIds(stats: UserStats): string[] {
  return BADGES.filter((b) => b.condition(stats)).map((b) => b.id);
}

export function isBadgeUnlocked(badgeId: string, stats: UserStats): boolean {
  const def = BADGES_BY_ID[badgeId];
  return def ? def.condition(stats) : false;
}
