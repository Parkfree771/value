import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

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

      // currentPrice와 initialPrice로 수익률 계산
      const initialPrice = data.initialPrice || 0;
      const currentPrice = data.currentPrice || 0;
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
