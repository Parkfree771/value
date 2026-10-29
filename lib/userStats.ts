// 사용자 통계·배지 영속화 (서버 전용, Neon Postgres)
// ─────────────────────────────────────────────────────────────────
// 데이터 소스: posts 테이블 (트리거가 likes/views/comment_count 자동 유지)
// 배지 저장: user_badges 테이블 (PK (user_id, badge_id), sticky)
// 통계는 매 호출 시 posts에서 재계산 — 별도 캐시 컬럼 없음.
//
// 호환성: 기존 호출자는 feed.json posts를 인자로 넘기지만 이제 무시.
// Postgres가 SoT.

import { sql } from './db';
import {
  calculateUserStats,
  getUnlockedBadgeIds,
  type PostForStats,
} from './badges';

export interface RecomputeOptions {
  dryRun?: boolean;
  onlyAuthorId?: string;
}

export interface RecomputeResult {
  scanned: number;          // 처리한 author 수
  written: number;          // user_badges 신규 INSERT 수행한 author 수
  newlyUnlocked: number;    // 신규 해금 배지 총 개수
  skippedMissing: number;   // users 없는 authorId (FK 위반)
}

interface PostRow {
  author_id: string;
  return_rate: number | null;
  views: number | null;
  likes: number | null;
  position_type: 'long' | 'short' | null;
  ticker: string | null;
  stock_name: string | null;
  exchange: string | null;
}

function toPostForStats(row: PostRow): PostForStats {
  return {
    returnRate: typeof row.return_rate === 'number' ? row.return_rate : Number(row.return_rate ?? 0),
    views: row.views ?? 0,
    likes: row.likes ?? 0,
    positionType: row.position_type ?? undefined,
    ticker: row.ticker ?? undefined,
    stockName: row.stock_name ?? undefined,
    exchange: row.exchange ?? undefined,
  };
}

/**
 * 전체 사용자(또는 onlyAuthorId 한정) 통계·배지를 재계산하여 user_badges에 sticky INSERT.
 * feedPosts 인자는 호환 위해 받지만 무시함 (Postgres가 SoT).
 */
export async function recomputeAllUserStatsFromFeed(
  _feedPosts: unknown[],
  options: RecomputeOptions = {},
): Promise<RecomputeResult> {
  const { dryRun = false, onlyAuthorId } = options;

  // 1. posts 조회 (필요한 컬럼만)
  let rows: PostRow[];
  try {
    rows = (onlyAuthorId
      ? await sql`
          select author_id, return_rate, views, likes, position_type, ticker, stock_name, exchange
          from posts where author_id = ${onlyAuthorId}
        `
      : await sql`
          select author_id, return_rate, views, likes, position_type, ticker, stock_name, exchange
          from posts
        `) as PostRow[];
  } catch (error) {
    console.error('[userStats] posts 조회 실패:', error);
    throw error;
  }

  // 2. authorId 별 그룹핑
  const byAuthor = new Map<string, PostForStats[]>();
  for (const r of rows) {
    if (!r.author_id) continue;
    const list = byAuthor.get(r.author_id) ?? [];
    list.push(toPostForStats(r));
    byAuthor.set(r.author_id, list);
  }

  const result: RecomputeResult = {
    scanned: byAuthor.size,
    written: 0,
    newlyUnlocked: 0,
    skippedMissing: 0,
  };

  if (byAuthor.size === 0) return result;

  // 3. 기존 user_badges 조회 (sticky 머지용)
  const uids = Array.from(byAuthor.keys());
  let existingBadges: Record<string, any>[];
  try {
    existingBadges = await sql`
      select user_id, badge_id from user_badges where user_id = any(${uids}::uuid[])
    `;
  } catch (badgesError) {
    console.error('[userStats] user_badges 조회 실패:', badgesError);
    throw badgesError;
  }

  const existingByUser = new Map<string, Set<string>>();
  for (const row of existingBadges) {
    const s = existingByUser.get(row.user_id) ?? new Set<string>();
    s.add(row.badge_id);
    existingByUser.set(row.user_id, s);
  }

  // 4. users 존재 여부 확인 (FK 위반 방지)
  // (기존 동작 유지: 조회 실패 시 빈 집합 → 전원 skippedMissing)
  const existingUsers = await sql`select id from users where id = any(${uids}::uuid[])`.catch(
    () => [] as Record<string, any>[],
  );
  const userIdSet = new Set(existingUsers.map((u) => u.id as string));

  // 5. 각 사용자별 신규 해금 배지 계산
  const toInsert: { user_id: string; badge_id: string }[] = [];
  for (const [uid, posts] of byAuthor) {
    if (!userIdSet.has(uid)) {
      result.skippedMissing++;
      continue;
    }
    const stats = calculateUserStats(posts);
    const freshIds = getUnlockedBadgeIds(stats);
    const already = existingByUser.get(uid) ?? new Set<string>();
    const newly = freshIds.filter((bid) => !already.has(bid));

    if (newly.length > 0) {
      result.newlyUnlocked += newly.length;
      result.written++;
      for (const bid of newly) {
        toInsert.push({ user_id: uid, badge_id: bid });
      }
    }
  }

  if (dryRun || toInsert.length === 0) return result;

  // 6. user_badges INSERT (ON CONFLICT DO NOTHING for safety, but PK 중복은 위에서 제외했음)
  try {
    await sql`
      insert into user_badges (user_id, badge_id)
      select * from unnest(
        ${toInsert.map((r) => r.user_id)}::uuid[],
        ${toInsert.map((r) => r.badge_id)}::text[]
      )
      on conflict (user_id, badge_id) do nothing
    `;
  } catch (insertError) {
    console.error('[userStats] user_badges INSERT 실패:', insertError);
    throw insertError;
  }

  return result;
}

export async function recomputeUserStatsFromFeed(
  uid: string,
  feedPosts: unknown[],
  options: { dryRun?: boolean } = {},
): Promise<RecomputeResult> {
  return recomputeAllUserStatsFromFeed(feedPosts, { ...options, onlyAuthorId: uid });
}
