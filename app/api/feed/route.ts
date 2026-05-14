/**
 * /api/feed
 *
 * 글 작성 후 호출되는 후처리 엔드포인트. feed.json 의존성 제거됨.
 * posts 자체는 이미 /write 페이지에서 Postgres로 INSERT. 여기서는:
 *   - 새 ticker면 current_prices에 행 추가
 *   - 사용자 통계·배지 재계산 (user_badges sticky INSERT)
 *   - IndexNow 핑
 *
 * DELETE는 별도 처리 없음 (post 삭제 시 호출되어도 모든 작업은 이미 다른 곳에서 처리됨).
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getServiceClient } from '@/lib/supabase-admin';
import { checkRateLimitRedis } from '@/lib/rate-limit-redis';
import { getClientIP, setRateLimitHeaders } from '@/lib/rate-limit';
import { pingIndexNow } from '@/lib/indexnow';
import { recomputeAllUserStatsFromFeed } from '@/lib/userStats';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr').replace(/\/$/, '');
const POST_RATE_LIMIT = 10;
const POST_RATE_WINDOW = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const userId = authData.user.id;

    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimitRedis(
      `post:${userId}:${clientIP}`,
      POST_RATE_LIMIT,
      POST_RATE_WINDOW,
    );
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: '게시글 작성이 너무 빈번합니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 },
      );
      setRateLimitHeaders(response.headers, rateLimitResult, POST_RATE_LIMIT);
      return response;
    }

    const body = await request.json();
    const { postId, postData } = body ?? {};
    if (!postId || !postData) {
      return NextResponse.json({ error: 'postId와 postData가 필요합니다.' }, { status: 400 });
    }

    // 새 ticker면 current_prices에 시드
    const ticker = (postData.ticker || '').toUpperCase();
    const exchange = (postData.exchange || '').toUpperCase();
    const currentPrice = Number(postData.currentPrice ?? postData.initialPrice ?? 0);
    if (ticker && exchange && currentPrice > 0) {
      const admin = getServiceClient();
      await admin
        .from('current_prices')
        .upsert(
          { ticker, exchange, current_price: currentPrice },
          { onConflict: 'ticker', ignoreDuplicates: true },
        );
    }

    // 비동기 후처리
    recomputeAllUserStatsFromFeed([], { onlyAuthorId: userId }).catch((err) =>
      console.warn('[Feed API] user stats recompute 실패:', err instanceof Error ? err.message : err),
    );

    const reportUrl = `${SITE_URL}/reports/${postId}`;
    pingIndexNow([reportUrl, `${SITE_URL}/`, `${SITE_URL}/sitemap.xml`, `${SITE_URL}/feed.xml`]).catch(
      (err) => console.warn('[Feed API] IndexNow 핑 실패:', err instanceof Error ? err.message : err),
    );

    return NextResponse.json({ success: true, message: '후처리 완료' });
  } catch (error) {
    console.error('[Feed API] POST error:', error);
    return NextResponse.json(
      { error: '후처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  // posts 삭제는 /api/reports/[id] DELETE가 직접 처리. 여기는 호환용 no-op.
  return NextResponse.json({ success: true });
}
