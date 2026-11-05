// 캐시 설계 — "시간이 지나면 갱신"이 아니라 "데이터가 바뀌면 갱신".
//
// DB 를 읽는 공용 함수는 Next 데이터 캐시(unstable_cache)로 감싸 인스턴스·요청 사이에서 공유하고,
// 데이터가 바뀌는 사건이 생기면 그때 태그로 비운다. 그 데이터를 쓴 ISR 페이지도 함께 다시 만들어진다.
//
//   사건                               비우는 태그
//   ──────────────────────────────    ───────────────────────────────
//   장 마감 가격 수집 완료 (cron)       posts · broker · prices  + 홈
//   글 작성 · 수정 · 삭제               posts · post:{id}        + 홈
//   좋아요 · 댓글                       post:{id}
//   전문가 추적 등록 · 수정 · 삭제      broker                   + 홈
//   구루 가격 수집 완료 (guru cron)     구루 목록 · 상세 경로
//   모닝 브리핑 발행 (news 배치)        briefing                 + 홈 · 브리핑
//
// 시간 기준 재검증(SAFETY_TTL)은 신호가 빠졌을 때를 대비한 하루짜리 안전장치일 뿐이다.
// 조회수는 캐시를 비우지 않는다 (조회마다 다시 만들면 캐시하는 의미가 없다).

import { revalidatePath, revalidateTag } from 'next/cache';

export const SAFETY_TTL = 60 * 60 * 24; // 1일

export const TAG = {
  posts: 'posts', // 회원 리포트 목록·상세·프로필 통계 (가격 포함)
  post: (id: string) => `post:${id}`, // 리포트 하나
  broker: 'broker', // 전문가 추적
  prices: 'prices', // 현재가 · 차트 종가 · 기간 비교 종가
  briefing: 'briefing', // 모닝 브리핑 · 지수 띠 (Object Storage 의 briefing.json · market.json)
} as const;

// Route Handler 에서 "즉시 만료" — 다음 요청은 새로 읽는다 (stale 을 내보내지 않음)
const NOW = { expire: 0 };

/** 홈은 SQL 을 직접 읽는 ISR 페이지라 경로로 비운다 */
function refreshHome() {
  revalidatePath('/');
}

/** 글 작성 · 수정 · 삭제 */
export function invalidatePosts(id?: string) {
  revalidateTag(TAG.posts, NOW);
  if (id) revalidateTag(TAG.post(id), NOW);
  refreshHome();
  revalidatePath('/sitemap.xml');
}

/** 좋아요 · 댓글 — 그 글 상세만 */
export function invalidatePost(id: string) {
  revalidateTag(TAG.post(id), NOW);
}

/** 전문가 추적 등록 · 수정 · 삭제 */
export function invalidateBroker() {
  revalidateTag(TAG.broker, NOW);
  refreshHome();
  revalidatePath('/sitemap.xml');
}

/** 모닝 브리핑 발행 완료 (news 배치) — 브리핑 파일 캐시 + 홈 · 브리핑 페이지 */
export function invalidateBriefing() {
  revalidateTag(TAG.briefing, NOW);
  refreshHome();
  revalidatePath('/briefing');
}

/** 구루 포트폴리오 가격 수집 완료 (guru_prices) — 구루 목록·상세 */
export function invalidateGuru() {
  revalidatePath('/guru-tracker', 'layout');
  revalidatePath('/portfolio/[slug]', 'layout');
}

/** 장 마감 가격 수집 완료 — 가격이 들어간 모든 것 */
export function invalidateMarket() {
  revalidateTag(TAG.prices, NOW);
  revalidateTag(TAG.posts, NOW);
  revalidateTag(TAG.broker, NOW);
  refreshHome();
}
