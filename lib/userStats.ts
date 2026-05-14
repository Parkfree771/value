// 사용자 통계·배지 영속화 (서버 전용)
// ─────────────────────────────────────────────────────────────────
// 판정 SoT: feed.json
// 저장 대상: users 컬렉션의 각 도큐먼트
//   {
//     stats: UserStats,
//     unlockedBadgeIds: string[],   // sticky — 한번 해금되면 영원히 유지
//     lastStatsUpdate: ISO string,
//   }
// 호출 시점: feed.json 갱신되는 모든 이벤트 (글 작성/수정/삭제, 가격 cron, TTL 갱신)

import { adminDb } from './firebase-admin';
import {
  calculateUserStats,
  getUnlockedBadgeIds,
  type PostForStats,
  type UserStats,
} from './badges';

// feed.json post 형식 → calculateUserStats 입력으로 정규화
function toPostForStats(p: any): PostForStats {
  return {
    returnRate: typeof p?.returnRate === 'number' ? p.returnRate : 0,
    views: p?.views ?? 0,
    likes: p?.likes ?? 0,
    positionType: p?.positionType,
    ticker: p?.ticker,
    stockName: p?.stockName,
    exchange: p?.exchange,
  };
}

export interface RecomputeOptions {
  dryRun?: boolean;
  // 특정 사용자만 재계산. 미지정 시 feed에 등장한 모든 authorId 대상.
  onlyAuthorId?: string;
}

export interface RecomputeResult {
  scanned: number;          // feed에서 본 authorId 수
  written: number;          // users에 실제 쓴 수
  newlyUnlocked: number;    // 신규 해금 배지 총 개수 (사용자별 union 증가분 합)
  skippedMissing: number;   // users 도큐먼트 없는 authorId
}

/**
 * feed.json posts 를 받아 author별로 통계+배지를 재계산하고
 * users 컬렉션에 sticky 머지로 저장한다.
 * - stats: 항상 최신값으로 덮어씀
 * - unlockedBadgeIds: 기존 ∪ 신규 (한번 해금되면 영원히 유지)
 * - 변경 없는 사용자는 skip (불필요한 쓰기 방지)
 */
export async function recomputeAllUserStatsFromFeed(
  feedPosts: any[],
  options: RecomputeOptions = {},
): Promise<RecomputeResult> {
  const { dryRun = false, onlyAuthorId } = options;

  // 1. authorId 별 그룹핑
  const byAuthor = new Map<string, PostForStats[]>();
  for (const p of feedPosts) {
    const authorId = p?.authorId;
    if (!authorId) continue;
    if (onlyAuthorId && authorId !== onlyAuthorId) continue;
    const arr = byAuthor.get(authorId) ?? [];
    arr.push(toPostForStats(p));
    byAuthor.set(authorId, arr);
  }

  const result: RecomputeResult = {
    scanned: byAuthor.size,
    written: 0,
    newlyUnlocked: 0,
    skippedMissing: 0,
  };

  if (byAuthor.size === 0) return result;

  // 2. 기존 users 도큐먼트 일괄 로드 (in batch · 최대 30개씩)
  const uids = Array.from(byAuthor.keys());
  const existing = new Map<string, { unlockedBadgeIds?: string[]; statsHash?: string }>();

  // adminDb.getAll 은 DocumentReference 가변인자, 청크 불필요
  const refs = uids.map((uid) => adminDb.collection('users').doc(uid));
  const snaps = refs.length > 0 ? await adminDb.getAll(...refs) : [];

  for (const snap of snaps) {
    if (!snap.exists) {
      result.skippedMissing++;
      continue;
    }
    const data = snap.data() ?? {};
    existing.set(snap.id, {
      unlockedBadgeIds: Array.isArray(data.unlockedBadgeIds) ? data.unlockedBadgeIds : [],
      statsHash: data.statsHash,
    });
  }

  // 3. 각 사용자에 대해 새 stats + sticky union 계산 → 변경 있을 때만 쓰기
  const now = new Date().toISOString();
  const writeOps: { uid: string; payload: Record<string, unknown> }[] = [];

  for (const [uid, posts] of byAuthor) {
    if (!existing.has(uid)) continue; // users 에 없는 authorId

    const stats: UserStats = calculateUserStats(posts);
    const freshUnlocked = getUnlockedBadgeIds(stats);
    const prev = existing.get(uid)!;
    const prevSet = new Set(prev.unlockedBadgeIds ?? []);
    const merged = Array.from(new Set([...prevSet, ...freshUnlocked])).sort();
    const newCount = merged.length - prevSet.size;
    if (newCount > 0) result.newlyUnlocked += newCount;

    const statsHash = JSON.stringify(stats);
    if (prev.statsHash === statsHash && newCount === 0) {
      // 변경 없음 → skip
      continue;
    }

    writeOps.push({
      uid,
      payload: {
        stats,
        statsHash,
        unlockedBadgeIds: merged,
        lastStatsUpdate: now,
      },
    });
  }

  if (dryRun || writeOps.length === 0) {
    result.written = writeOps.length;
    return result;
  }

  // 4. 배치 쓰기 (Firestore batch 한도 500)
  const BATCH_MAX = 400;
  for (let i = 0; i < writeOps.length; i += BATCH_MAX) {
    const batch = adminDb.batch();
    const chunk = writeOps.slice(i, i + BATCH_MAX);
    for (const op of chunk) {
      batch.set(adminDb.collection('users').doc(op.uid), op.payload, { merge: true });
    }
    await batch.commit();
  }
  result.written = writeOps.length;
  return result;
}

/**
 * 단일 authorId 한정 재계산 (글 작성·삭제 직후 호출용)
 * feedPosts 는 전체 또는 해당 author 의 글만 들어 있어도 동작.
 */
export async function recomputeUserStatsFromFeed(
  uid: string,
  feedPosts: any[],
  options: { dryRun?: boolean } = {},
): Promise<RecomputeResult> {
  return recomputeAllUserStatsFromFeed(feedPosts, { ...options, onlyAuthorId: uid });
}
