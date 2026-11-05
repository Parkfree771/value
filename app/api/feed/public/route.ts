/**
 * /api/feed/public
 *
 * 최신 500건 + 가격 + 기간 수익률 — 클라이언트(홈 검색·필터, 종목 검색, 마이페이지)가 전체 글 목록을 받아 필터링.
 * 서버 페이지(랭킹·개인 리포트 등)와 같은 getFeedData() 를 쓴다 → 같은 데이터 캐시(태그 posts/prices)를 공유하므로
 * DB 는 글 작성·수정·삭제 또는 장 마감 수집 후 처음 한 번만 읽는다 (lib/cache.ts).
 * CDN 은 1분만 들고 있다 — 글을 쓰면 1분 안에 반영 (데이터 캐시는 즉시 비워지므로 CDN 미스는 DB 를 안 읽는다).
 */

import { NextResponse } from 'next/server';
import { getFeedData } from '@/lib/feedData';

export async function GET() {
  const data = await getFeedData();
  if (!data) {
    return NextResponse.json({ posts: [], prices: {}, totalPosts: 0 }, { status: 500 });
  }
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' },
  });
}
