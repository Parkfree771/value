import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { jsonCache, CACHE_KEYS } from '@/lib/jsonCache';
import { verifyAdmin } from '@/lib/admin/adminVerify';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // 관리자 인증 필수
  const admin = await verifyAdmin(request.headers.get('authorization'));
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 레이트 리밋: 분당 10회
  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(`revalidate:${ip}`, 10, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { path } = await request.json();

    // 경로가 지정되면 해당 경로만, 아니면 홈 페이지 revalidate
    const targetPath = path || '/';

    // Next.js 페이지 캐시 무효화
    revalidatePath(targetPath);

    // 메모리 캐시도 무효화 (랭킹, 마이페이지 등에서 즉시 반영)
    jsonCache.invalidate(CACHE_KEYS.FEED);

    return NextResponse.json({
      revalidated: true,
      path: targetPath,
      now: Date.now()
    });
  } catch (error) {
    console.error('[Revalidate] Error:', error);
    return NextResponse.json(
      { revalidated: false, error: 'Failed to revalidate' },
      { status: 500 }
    );
  }
}
