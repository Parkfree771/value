import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const PORTFOLIOS_PATH = path.join(process.cwd(), 'data', 'guru-portfolios.json');

// 서버 프로세스 내 메모리 캐시
let cachedData: any = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1시간

function getPortfoliosData() {
  const now = Date.now();
  if (cachedData && (now - cacheTime) < CACHE_TTL) {
    return cachedData;
  }

  if (!fs.existsSync(PORTFOLIOS_PATH)) {
    return null;
  }

  cachedData = JSON.parse(fs.readFileSync(PORTFOLIOS_PATH, 'utf-8'));
  cacheTime = now;
  return cachedData;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const data = getPortfoliosData();

    if (!data || !data.gurus[slug]) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      portfolio: data.gurus[slug],
    });

    // 로컬 JSON은 분기 1회 변경 → 긴 캐시
    response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800');

    return response;
  } catch (error) {
    console.error('Guru portfolio API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
