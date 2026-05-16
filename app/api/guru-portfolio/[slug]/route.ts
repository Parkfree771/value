import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const PORTFOLIOS_PATH = path.join(process.cwd(), 'data', 'guru-portfolios.json');

// 서버 프로세스 내 메모리 캐시
// 13F 데이터는 분기 1회만 변경되고, 갱신 시 git push로 새 배포가 트리거되므로 길게 잡아도 안전.
let cachedData: any = null;
let cacheTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

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

    // 로컬 JSON은 분기 1회만 변경되며 갱신 시 git push로 빌드가 새로 돌아 자동 무효화됨.
    // → CDN 캐시를 30일로 길게 잡고, 그 사이엔 stale 응답 허용 (다음 분기까지 거의 영원).
    response.headers.set('Cache-Control', 'public, s-maxage=2592000, stale-while-revalidate=2592000');

    return response;
  } catch (error) {
    console.error('Guru portfolio API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
