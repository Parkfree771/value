// GET /api/stocks/search?q=삼성&limit=20 — 종목 자동완성
// 검색 규칙은 클라이언트(글쓰기 종목 검색)와 같은 lib/stockSearchIndex 를 쓴다 (공백 무시 · 초성 · 별칭 · 인기 가중치).

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCryptoStocksForIndex } from '@/lib/cryptoCoins';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { stockSearchIndex, type GlobalStock } from '@/lib/stockSearchIndex';

/** 인스턴스당 한 번 — global-stocks.json(약 3만 종목) + 코인으로 인덱스 빌드 */
function ensureIndex() {
  if (stockSearchIndex.ready) return;
  const filePath = path.join(process.cwd(), 'public', 'data', 'global-stocks.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as { stocks: GlobalStock[] };
  stockSearchIndex.build([...getCryptoStocksForIndex(), ...data.stocks]);
}

export async function GET(request: NextRequest) {
  // 레이트 리밋: IP당 분당 60회 (검색 자동완성 고려)
  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(`stock-search:${ip}`, 60, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const query = request.nextUrl.searchParams.get('q');
    const limit = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '20', 10) || 20));
    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    ensureIndex();
    const stocks = stockSearchIndex.search(query, limit);

    return NextResponse.json(
      { success: true, stocks, count: stocks.length },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
    );
  } catch (error) {
    console.error('Stock search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search stocks',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
