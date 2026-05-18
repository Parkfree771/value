'use client';

import { memo } from 'react';
import BadgeIcon from './BadgeIcon';
import { useUserBadge, useUserBadgesContext } from '@/contexts/UserBadgesContext';
import { BADGES_BY_ID } from '@/lib/badges';

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
const UserBadgeInline = memo(function UserBadgeInline({
  badgeId,
  nickname,
  size = 16,
  className = '',
}: Props) {
  const ctx = useUserBadgesContext();
  // 캐시에 명시적으로 들어있으면(setBadge로 쓰여졌으면) 그게 truth — props 스냅샷보다 최신.
  const cached = nickname ? ctx.badges[nickname] : undefined;
  // props 가 명시돼 있으면 fetch 트리거 안 함 (불필요한 네트워크 콜 방지).
  const fetchedBadgeId = useUserBadge(badgeId === undefined ? nickname : null);

  const finalId =
    cached !== undefined ? cached :
    badgeId !== undefined ? badgeId :
    fetchedBadgeId;

  if (!finalId) return null;

  // 새 PNG 배지 체계 (single-*, avg-*, activity-*, special-*)
  if (/^(single|avg|activity|special)-/.test(finalId)) {
    return (
      <img
        src={`/badges/${finalId}.png`}
        alt={finalId}
        width={size}
        height={size}
        className={`inline-block flex-shrink-0 align-middle ${className}`}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    );
  }

  // 기존 SVG 배지
  const def = BADGES_BY_ID[finalId];
  if (!def) return null;
  return (
    <BadgeIcon
      id={finalId}
      size={size}
      className={`inline-block flex-shrink-0 align-middle ${className}`}
      title={`${def.name} — ${def.description}`}
    />
  );
});

export default UserBadgeInline;
