'use client';

import { memo } from 'react';
import { useUserBadge, useUserBadgesContext } from '@/contexts/UserBadgesContext';
import { BADGES_BY_ID, BADGE_ASSETS_VERSION } from '@/lib/badges';

interface Props {
  // badgeId 가 직접 주어지면 그 값으로 렌더 (feed.json post.equippedBadgeId 스냅샷).
  // 없으면 nickname 기반 batch 조회 (fallback — 점진적 마이그레이션용).
  badgeId?: string | null;
  nickname?: string | null;
  size?: number;
  className?: string;
}

// 우선순위:
//   1. context cache (본인 배지 변경 직후 setBadge 로 즉시 갱신됨 → live update)
//   2. props badgeId (SSR/피드 스냅샷 — 첫 페인트 FOUC 없음)
//   3. nickname 기반 fetch fallback (props 없는 레거시 경로)
//
// 렌더링:
//   single-* / avg-* / activity-* — PNG (public/badges/<id>.png)
//   special-*                     — PNG (있으면) 또는 텍스트 placeholder
//   알 수 없는 ID (옛 잔재 등)    — null
const UserBadgeInline = memo(function UserBadgeInline({
  badgeId,
  nickname,
  size = 16,
  className = '',
}: Props) {
  const ctx = useUserBadgesContext();
  const cached = nickname ? ctx.badges[nickname] : undefined;
  const fetchedBadgeId = useUserBadge(badgeId === undefined ? nickname : null);

  const finalId =
    cached !== undefined ? cached :
    badgeId !== undefined ? badgeId :
    fetchedBadgeId;

  if (!finalId) return null;

  const def = BADGES_BY_ID[finalId];
  if (!def) return null; // 옛 ID 잔재는 무시

  return (
    <img
      src={`/badges/${finalId}.png?v=${BADGE_ASSETS_VERSION}`}
      alt={def.name}
      title={`${def.name} — ${def.description}`}
      width={size}
      height={size}
      className={`inline-block flex-shrink-0 align-middle ${className}`}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
});

export default UserBadgeInline;
