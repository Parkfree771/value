// 레벨 시스템 (배지 대체) — 지금은 "Lv.N" 숫자만 표시. 시각 디자인(아이콘·애니메이션)은 추후 결정.
// ─────────────────────────────────────────────────────────────────
// 점수 공식은 DB(db/migrations/0003_user_levels.sql 의 user_level_breakdown 뷰)가 계산하고
// users.level_points 에 최고점(sticky)으로 저장한다. 여기 LEVEL_RULES 는 안내 문구용 — 공식을 바꾸면 둘 다 수정.

export const LEVEL_RULES = [
  { key: 'record', label: '기록', desc: '리포트 1개당 20점' },
  { key: 'hold', label: '보유', desc: '리포트마다 30일 지날 때마다 1점 (최대 12점)' },
  { key: 'profit', label: '수익', desc: '리포트마다 수익률 1%당 1점 (최대 300점, 손실은 0점)' },
] as const;

export const MAX_LEVEL = 60;

/** 레벨 n 에 도달하는 누적 점수: 0, 10, 30, 60, 100, 150, … (첫 리포트 20점이면 바로 Lv.2) */
export function levelThreshold(level: number): number {
  return 5 * level * (level - 1);
}

export interface LevelInfo {
  level: number;
  points: number;
  currentFloor: number;   // 현재 레벨 시작 점수
  nextAt: number | null;  // 다음 레벨 점수 (만렙이면 null)
  progress: number;       // 0~1, 다음 레벨까지 진행률
}

export function getLevelInfo(points: number | null | undefined): LevelInfo {
  const p = Math.max(0, Math.floor(points ?? 0));
  let level = 1;
  while (level < MAX_LEVEL && p >= levelThreshold(level + 1)) level++;
  const currentFloor = levelThreshold(level);
  const nextAt = level < MAX_LEVEL ? levelThreshold(level + 1) : null;
  return {
    level,
    points: p,
    currentFloor,
    nextAt,
    progress: nextAt === null ? 1 : (p - currentFloor) / (nextAt - currentFloor),
  };
}
