import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { updateReportReturnRate } from '@/lib/stockPrice';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // createdAt, returnRate, views
    const limitCount = parseInt(searchParams.get('limit') || '50', 10);

    console.log(`[API Reports] Fetching reports - sortBy: ${sortBy}, limit: ${limitCount}`);

    // Firestore에서 리포트 가져오기
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      orderBy(sortBy, 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);

    console.log(`[API Reports] Found ${querySnapshot.docs.length} reports`);

    // 각 리포트의 실시간 수익률 계산
    const reports = await Promise.all(
      querySnapshot.docs.map(async (doc) => {
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

        // 기본 리포트 데이터
        const baseReport = {
          id: doc.id,
          title: data.title || '',
          author: data.authorName || '익명',
          stockName: data.stockName || '',
          ticker: data.ticker || '',
          opinion: data.opinion || 'hold',
          returnRate: data.returnRate || 0,
          initialPrice: data.initialPrice || 0,
          currentPrice: data.currentPrice || 0,
          createdAt: createdAtStr,
          views: data.views || 0,
          likes: data.likes || 0,
        };

        // ticker와 initialPrice가 있는 경우에만 실시간 수익률 계산
        if (data.ticker && data.initialPrice) {
          try {
            console.log(`[API Reports] Updating return rate for ${data.ticker}`);
            const updated = await updateReportReturnRate(
              data.ticker,
              data.initialPrice,
              data.opinion === 'sell' ? 'short' : 'long'
            );

            if (updated) {
              console.log(`[API Reports] Updated ${data.ticker}: ${updated.returnRate}%`);
              return {
                ...baseReport,
                currentPrice: updated.currentPrice,
                returnRate: updated.returnRate,
              };
            }
          } catch (error) {
            console.error(`[API Reports] Failed to update ${data.ticker}:`, error);
          }
        }

        // 실시간 업데이트 실패 시 저장된 데이터 사용
        return baseReport;
      })
    );

    console.log(`[API Reports] Successfully processed ${reports.length} reports`);

    return NextResponse.json({
      success: true,
      reports,
      count: reports.length,
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
