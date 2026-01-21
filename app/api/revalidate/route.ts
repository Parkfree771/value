import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { jsonCache, CACHE_KEYS } from '@/lib/jsonCache';

export async function POST(request: NextRequest) {
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
