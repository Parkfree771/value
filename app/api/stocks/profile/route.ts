import { NextRequest, NextResponse } from 'next/server';
import { getCompanyProfile } from '@/lib/kis';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const exchange = searchParams.get('exchange') || undefined;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    console.log(`[API /stocks/profile] 기업 프로필 조회: ${symbol}`);

    // 기업 프로필 조회
    const profile = await getCompanyProfile(symbol, exchange);

    if (!profile) {
      return NextResponse.json(
        { error: `Failed to get profile for ${symbol}` },
        { status: 404 }
      );
    }

    console.log(`[API /stocks/profile] 조회 성공: ${symbol}`);

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('Company profile error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get company profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
