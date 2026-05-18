// 배지·업적 시스템 (새 PNG 기반)
// ─────────────────────────────────────────────────────────────────
// 카테고리 4종:
//   single   — 단일 리포트 최고 수익률 (8단계, 10/30/50/100/300/500/700/1000%)
//   avg      — 전체 리포트 평균 수익률 (8단계, 동일 % 임계, 최소 5글)
//   activity — 활동량 (5단계, 글 수 기반: 1/5/15/40/100)
//   special  — 단발성 업적 (14종) — 일부는 추적 데이터 미구현이라 condition=false
//
// 해금 판정은 매번 통계에서 계산 (lib/userStats.ts가 호출 → user_badges에 sticky 누적).
// users.equipped_badge_id 컬럼에 장착 1개 ID 저장.

export type BadgeCategory = 'single' | 'avg' | 'activity';

// PNG 캐시 버스팅 — PNG 갱신할 때마다 이 숫자를 올리면 클라이언트 캐시 무효화됨
export const BADGE_ASSETS_VERSION = '2';

export interface UserStats {
  totalReports: number;
  avgReturnRate: number;
  maxReturnRate: number;
  minReturnRate: number;
  winRate: number;              // 0-100
  totalViews: number;
  totalLikes: number;
  uniqueTickers: number;
  cryptoCount: number;
  maxSinglePostLikes: number;   // 단일 리포트 최고 좋아요
  maxSinglePostViews: number;   // 단일 리포트 최고 조회
}

// 인버스 ETF 식별 — short 통계 등에 쓰던 헬퍼. 새 시스템에서 직접 안 쓰지만
// 다른 코드에서 import할 수 있어 호환 유지.
const INVERSE_ETF_TICKERS = new Set<string>([
  'SQQQ', 'PSQ', 'QID', 'SH', 'SDS', 'SPXU', 'SPXS',
  'DOG', 'DXD', 'TZA', 'TWM', 'SOXS', 'FAZ', 'SCO',
  'TBT', 'TMV',
  '252670', '233160', '114800', '139660',
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
  level?: number;
  threshold?: number;
  condition: (s: UserStats) => boolean;
}

// ─── 단일 수익률 (single) ───────────────────────────────────
const SINGLE_THRESHOLDS = [10, 30, 50, 100, 300, 500, 700, 1000] as const;
const SINGLE_BADGES: BadgeDef[] = SINGLE_THRESHOLDS.map((t, i) => ({
  id: `single-${i + 1}`,
  name: `단일 +${t}%`,
  description: `한 리포트라도 +${t}% 달성`,
  category: 'single',
  level: i + 1,
  threshold: t,
  condition: (s) => s.maxReturnRate >= t,
}));

// ─── 평균 수익률 (avg) — 최소 5글 ───────────────────────────
const AVG_THRESHOLDS = [10, 30, 50, 100, 300, 500, 700, 1000] as const;
const AVG_MIN_REPORTS = 5;
const AVG_BADGES: BadgeDef[] = AVG_THRESHOLDS.map((t, i) => ({
  id: `avg-${i + 1}`,
  name: `평균 +${t}%`,
  description: `리포트 ${AVG_MIN_REPORTS}개+ & 평균 +${t}%`,
  category: 'avg',
  level: i + 1,
  threshold: t,
  condition: (s) => s.totalReports >= AVG_MIN_REPORTS && s.avgReturnRate >= t,
}));

// ─── 활동 (activity) — 글 수 기반, 단계 텀 큼 ─────────────────
const ACTIVITY_THRESHOLDS = [1, 5, 15, 40, 100] as const;
const ACTIVITY_BADGES: BadgeDef[] = ACTIVITY_THRESHOLDS.map((t, i) => ({
  id: `activity-${i + 1}`,
  name: `활동 Lv${i + 1}`,
  description: `리포트 ${t}개+ 작성`,
  category: 'activity',
  level: i + 1,
  threshold: t,
  condition: (s) => s.totalReports >= t,
}));

// ─── 통합 export ─────────────────────────────────────────────
export const BADGES: BadgeDef[] = [
  ...SINGLE_BADGES,
  ...AVG_BADGES,
  ...ACTIVITY_BADGES,
];

export const BADGES_BY_ID: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.id, b])
);

export const BADGES_BY_CATEGORY: Record<BadgeCategory, BadgeDef[]> = {
  single: SINGLE_BADGES,
  avg: AVG_BADGES,
  activity: ACTIVITY_BADGES,
};

export const CATEGORY_LABEL: Record<BadgeCategory, string> = {
  single: '단일 수익률',
  avg: '평균 수익률',
  activity: '활동',
};

export const CATEGORY_DESC: Record<BadgeCategory, string> = {
  single: '한 리포트라도 해당 % 달성 시 획득 (홈런)',
  avg: '전체 리포트 평균 수익률 기준 (단일보다 어려움)',
  activity: '리포트 작성량 누적',
};

// ─── 통계 계산 ──────────────────────────────────────────────
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
      uniqueTickers: 0,
      cryptoCount: 0,
      maxSinglePostLikes: 0,
      maxSinglePostViews: 0,
    };
  }

  const returns = posts.map((p) => p.returnRate ?? 0);
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
    uniqueTickers: tickers.size,
    cryptoCount,
    maxSinglePostLikes: Math.max(0, ...posts.map((p) => p.likes ?? 0)),
    maxSinglePostViews: Math.max(0, ...posts.map((p) => p.views ?? 0)),
  };
}

export function getUnlockedBadgeIds(stats: UserStats): string[] {
  return BADGES.filter((b) => b.condition(stats)).map((b) => b.id);
}

export function isBadgeUnlocked(badgeId: string, stats: UserStats): boolean {
  const def = BADGES_BY_ID[badgeId];
  return def ? def.condition(stats) : false;
}
