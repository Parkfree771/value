import { NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file('guru-stock-prices.json');

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json(
        { error: 'Price data not available', message: 'Cron job이 아직 실행되지 않았습니다.' },
        { status: 503 }
      );
    }

    const [contents] = await file.download();
    const priceData = JSON.parse(contents.toString('utf-8'));

    const response = NextResponse.json({
      success: true,
      lastUpdated: priceData.lastUpdated,
      totalTickers: priceData.totalTickers,
      prices: priceData.prices,
    });

    // 캐시키(?ck=)로 URL 자체가 변경되므로 s-maxage는 넉넉하게
    // 06:00-07:00 KST: 10분마다 캐시키 변경 → 자동 갱신
    // 나머지 시간: 날짜 단위 캐시키 → 하루 캐시
    response.headers.set('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400');

    return response;
  } catch (error) {
    console.error('[Portfolio Prices] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
