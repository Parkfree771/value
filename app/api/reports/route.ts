import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp, startAfter, doc, getDoc, getCountFromServer } from 'firebase/firestore';
import { getLatestPrices } from '@/lib/priceCache';
import { calculateReturn } from '@/utils/calculateReturn';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10', 10), 50); // 최대 50개 제한
    const cursor = searchParams.get('cursor'); // 커서 기반 페이지네이션

    console.log(`[API Reports] Fetching reports - sortBy: ${sortBy}, pageSize: ${pageSize}, cursor: ${cursor}`);

    const postsRef = collection(db, 'posts');

    // 쿼리 구성
    let q;
    if (cursor) {
      // 커서가 있으면 해당 문서 이후부터 가져오기
      const cursorDoc = await getDoc(doc(db, 'posts', cursor));
      if (cursorDoc.exists()) {
        q = query(
          postsRef,
          orderBy(sortBy, 'desc'),
          startAfter(cursorDoc),
          limit(pageSize)
        );
      } else {
        // 커서 문서가 없으면 처음부터
        q = query(postsRef, orderBy(sortBy, 'desc'), limit(pageSize));
      }
    } else {
      q = query(postsRef, orderBy(sortBy, 'desc'), limit(pageSize));
    }

    // 병렬로 데이터와 총 개수 가져오기
    const [querySnapshot, countSnapshot, latestPrices] = await Promise.all([
      getDocs(q),
      getCountFromServer(query(postsRef)),
      getLatestPrices()
    ]);

    console.log(`[API Reports] Found ${querySnapshot.docs.length} reports`);

    // 각 리포트에 가격 적용
    const reports = querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();

      // createdAt 변환
      let createdAtStr = '';
      if (data.createdAt instanceof Timestamp) {
        createdAtStr = data.createdAt.toDate().toISOString().split('T')[0];
      } else if (typeof data.createdAt === 'string') {
        createdAtStr = data.createdAt;
      } else {
        createdAtStr = new Date().toISOString().split('T')[0];
      }

      // JSON에서 최신 가격 가져오기
      const ticker = (data.ticker || '').toUpperCase();
      const jsonPrice = latestPrices[ticker]?.currentPrice;

      const initialPrice = data.initialPrice || 0;
      const currentPrice = jsonPrice || data.currentPrice || 0;
      const positionType = data.positionType || (data.opinion === 'sell' ? 'short' : 'long');

      const returnRate = calculateReturn(initialPrice, currentPrice, positionType);

      return {
        id: docSnap.id,
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
        exchange: data.exchange || '',
        category: data.category || '',
        stockData: data.stockData || null,
        themes: data.themes || [],
      };
    });

    // 다음 페이지 커서 (마지막 문서 ID)
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
    const nextCursor = lastDoc ? lastDoc.id : null;
    const hasMore = querySnapshot.docs.length === pageSize;

    console.log(`[API Reports] Successfully processed ${reports.length} reports`);

    const response = NextResponse.json({
      success: true,
      reports,
      count: reports.length,
      total: countSnapshot.data().count,
      nextCursor,
      hasMore,
      pageSize,
    });

    // 캐시 헤더 추가 (1분간 캐시, stale-while-revalidate)
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    return response;
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
