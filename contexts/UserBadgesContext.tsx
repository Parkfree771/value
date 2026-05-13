'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// 닉네임 → 장착 배지 ID. 미장착은 null, 미조회는 undefined.
type BadgesMap = Record<string, string | null>;

interface UserBadgesContextValue {
  badges: BadgesMap;
  // 컴포넌트에서 자기가 필요한 닉네임 등록 (배치 fetch 큐에 들어감)
  request: (nicknames: string[]) => void;
  // 본인 배지 변경 직후 캐시 즉시 반영용
  setBadge: (nickname: string, badgeId: string | null) => void;
}

const UserBadgesContext = createContext<UserBadgesContextValue>({
  badges: {},
  request: () => {},
  setBadge: () => {},
});

// 50ms debounce — 같은 페이지의 여러 카드가 마운트되며 들어오는 요청을 1회에 묶음
const BATCH_DEBOUNCE_MS = 50;

export function UserBadgesProvider({ children }: { children: React.ReactNode }) {
  const [badges, setBadges] = useState<BadgesMap>({});
  // setState 안에서 직접 보지 못해서 ref로 동기 체크
  const badgesRef = useRef<BadgesMap>({});
  const pendingRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    timerRef.current = null;
    const toFetch = Array.from(pendingRef.current);
    pendingRef.current.clear();
    if (toFetch.length === 0) return;

    try {
      const res = await fetch('/api/users/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicknames: toFetch }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const fetched: BadgesMap = data.badges || {};
      // 누락된 닉네임은 명시적으로 null로 캐시해서 다음에 재요청 안 하도록
      const merged: BadgesMap = { ...badgesRef.current };
      for (const n of toFetch) {
        merged[n] = n in fetched ? fetched[n] : null;
      }
      badgesRef.current = merged;
      setBadges(merged);
    } catch (e) {
      // 실패는 조용히 — 다음에 다시 요청될 수 있음
      console.error('[UserBadgesContext] fetch error:', e);
    }
  }, []);

  const request = useCallback(
    (nicknames: string[]) => {
      let added = false;
      for (const n of nicknames) {
        if (!n) continue;
        if (n in badgesRef.current) continue; // 이미 조회됨
        if (pendingRef.current.has(n)) continue; // 이미 큐에 있음
        pendingRef.current.add(n);
        added = true;
      }
      if (added) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, BATCH_DEBOUNCE_MS);
      }
    },
    [flush]
  );

  const setBadge = useCallback((nickname: string, badgeId: string | null) => {
    if (!nickname) return;
    badgesRef.current = { ...badgesRef.current, [nickname]: badgeId };
    setBadges(badgesRef.current);
  }, []);

  return (
    <UserBadgesContext.Provider value={{ badges, request, setBadge }}>
      {children}
    </UserBadgesContext.Provider>
  );
}

export function useUserBadgesContext() {
  return useContext(UserBadgesContext);
}

// 특정 닉네임의 장착 배지 ID. 미조회 동안 undefined, 미장착이면 null.
export function useUserBadge(nickname: string | undefined | null): string | null | undefined {
  const ctx = useUserBadgesContext();
  useEffect(() => {
    if (nickname) ctx.request([nickname]);
  }, [nickname, ctx]);
  if (!nickname) return null;
  return ctx.badges[nickname];
}
