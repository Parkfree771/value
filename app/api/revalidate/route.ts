// 캐시 갱신 신호 — 시간 대신 "일이 끝났을 때" 부른다 (lib/cache.ts)
//
//   POST { scope: 'market' }   장 마감 가격 수집 완료 (price cron 이 마지막에 한 번)
//   POST { scope: 'posts' }    회원 리포트 전체 (수동)
//   POST { scope: 'broker' }   전문가 추적 (수동)
//   POST { scope: 'guru' }     구루 가격 수집 완료 (guru cron)
//   POST { scope: 'briefing' } 모닝 브리핑 발행 완료 (news 배치는 { path: '/briefing' } 로 보내도 같다)
//   POST { path: '/…' }       특정 경로
//
// 인증: x-revalidate-secret (cron) 또는 관리자 세션.
// 글 작성·수정·삭제는 각 API 가 저장 직후 직접 비우므로 여기를 거치지 않는다.

import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin/adminVerify';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { invalidateBriefing, invalidateBroker, invalidateGuru, invalidateMarket, invalidatePosts } from '@/lib/cache';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');
  const isSecretValid = !!secret && !!process.env.REVALIDATE_SECRET && secret === process.env.REVALIDATE_SECRET;

  if (!isSecretValid) {
    const admin = await verifyAdmin(request.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // 레이트 리밋: 분당 10회
  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(`revalidate:${ip}`, 10, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { scope?: string; path?: string };

    if (body.scope === 'market') invalidateMarket();
    else if (body.scope === 'posts') invalidatePosts();
    else if (body.scope === 'broker') invalidateBroker();
    else if (body.scope === 'guru') invalidateGuru();
    // 뉴스 배치는 발행 후 { path: '/' }, { path: '/briefing' } 를 보낸다 — 브리핑 파일 캐시까지 비운다
    else if (body.scope === 'briefing' || body.path === '/briefing') invalidateBriefing();
    else revalidatePath(body.path || '/');

    return NextResponse.json({ revalidated: true, scope: body.scope ?? null, path: body.path ?? null, now: Date.now() });
  } catch (error) {
    console.error('[Revalidate] Error:', error);
    return NextResponse.json({ revalidated: false, error: 'Failed to revalidate' }, { status: 500 });
  }
}
