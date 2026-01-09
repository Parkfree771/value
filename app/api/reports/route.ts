import { NextRequest, NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';

// JSON 캐시
let cachedPrices: Record<string, { currentPrice: number; exchange: string }> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 1분

async function getLatestPrices(): Promise<Record<string, { currentPrice: number; exchange: string }>> {
  const now = Date.now();
  if (cachedPrices && now - cacheTimestamp < CACHE_DURATION) {
    return cachedPrices;
  }

  try {
    const storageRef = ref(storage, 'stock-prices.json');
    const downloadURL = await getDownloadURL(storageRef);
    const response = await fetch(downloadURL);
    const data = await response.json();
    cachedPrices = data.prices || {};
    cacheTimestamp = now;
    console.log(`[Reports API] Loaded ${Object.keys(cachedPrices || {}).length} prices from JSON`);
    return cachedPrices || {};
  } catch (error) {
    console.error('[Reports API] Failed to load prices JSON:', error);
    return cachedPrices || {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // createdAt, returnRate, views
    const limitCount = parseInt(searchParams.get('limit') || '20', 10); // 50 → 20 최적화
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '5', 10);

    console.log(`[API Reports] Fetching reports - sortBy: ${sortBy}, limit: ${limitCount}, page: ${page}, pageSize: ${pageSize}`);

    // Firestore에서 리포트 가져오기
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      orderBy(sortBy, 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);

    console.log(`[API Reports] Found ${querySnapshot.docs.length} reports`);

    // JSON에서 최신 가격 가져오기
    const latestPrices = await getLatestPrices();

    // 각 리포트에 가격 적용 (이제 빠름!)
    const reports = querySnapshot.docs.map((doc) => {
      const data = doc.data();

      // createdAt 변환
      let createdAtStr = '';
      if (data.createdAt instanceof Timestamp) {
        createdAtStr = data.createdAt.toDate().toISOString().split('T')[0];
      } else if (typeof data.createdAt === 'string') {
        createdAtStr = data.createdAt;
      } else {
        createdAtStr = new Date().toISOString().split('T')[0];
      }

      // JSON에서 최신 가격 가져오기 (없으면 Firestore 값 사용)
      const ticker = (data.ticker || '').toUpperCase();
      const jsonPrice = latestPrices[ticker]?.currentPrice;

      // currentPrice와 initialPrice로 수익률 계산
      const initialPrice = data.initialPrice || 0;
      const currentPrice = jsonPrice || data.currentPrice || 0;
      const positionType = data.positionType || (data.opinion === 'sell' ? 'short' : 'long');

      let returnRate = 0;
      if (initialPrice > 0 && currentPrice > 0) {
        if (positionType === 'long') {
          returnRate = ((currentPrice - initialPrice) / initialPrice) * 100;
        } else {
          // SHORT
          returnRate = ((initialPrice - currentPrice) / initialPrice) * 100;
        }
      }

      return {
        id: doc.id,
        title: data.title || '',
        author: data.authorName || '익명',
        stockName: data.stockName || '',
        ticker: data.ticker || '',
        opinion: data.opinion || 'hold',
        returnRate: parseFloat(returnRate.toFixed(2)),
        initialPrice,
        currentPrice,
        createdAt: createdAtStr,
        views: data.views || 0,
        likes: data.likes || 0,
      };
    });

    console.log(`[API Reports] Successfully processed ${reports.length} reports`);

    // 페이지네이션 적용
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedReports = reports.slice(startIndex, endIndex);
    const totalPages = Math.ceil(reports.length / pageSize);

    return NextResponse.json({
      success: true,
      reports: paginatedReports,
      count: paginatedReports.length,
      total: reports.length,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error('[API Reports] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch reports',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
