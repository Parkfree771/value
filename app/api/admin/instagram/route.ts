// GET /api/admin/instagram — 모닝 브리핑 인스타 게시용 묶음 (카드 5장 · 릴스 · 캡션). 관리자 전용.
// 배치(scripts/news/run.mjs)가 instagram/{YYYY-MM-DD}/manifest.json 을 올린다. 오늘부터 7일 전까지 가장 최근 것.

import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin/adminVerify';
import { publicUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

function kstDate(daysAgo: number): string {
  return new Date(Date.now() + 9 * 3600 * 1000 - daysAgo * 86400 * 1000).toISOString().slice(0, 10);
}

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.AWS_ENDPOINT_URL_S3) return NextResponse.json({ manifest: null });

  for (let d = 0; d < 7; d++) {
    const date = kstDate(d);
    const res = await fetch(publicUrl(`instagram/${date}/manifest.json`), { cache: 'no-store' });
    if (res.ok) {
      return NextResponse.json({ manifest: await res.json() }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
  }
  return NextResponse.json({ manifest: null }, { headers: { 'Cache-Control': 'private, no-store' } });
}
