import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin/adminVerify';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // 인증: x-revalidate-secret (cron용) 또는 admin (대시보드용) 중 하나
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
    const { path } = await request.json();

    // 경로가 지정되면 해당 경로만, 아니면 홈 페이지 revalidate
    const targetPath = path || '/';

    // Next.js 페이지 캐시 무효화 (ISR)
    revalidatePath(targetPath);

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
