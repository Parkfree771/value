import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp, where, documentId, getDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sortBy') || 'created_at'; // created_at, return_rate, views
    const limitCount = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '5', 10);

    console.log(`[API Market-call] Fetching market-call - sortBy: ${sortBy}, limit: ${limitCount}, page: ${page}, pageSize: ${pageSize}`);

    // Firestore에서 market-call 데이터 가져오기
    const marketCallRef = collection(db, 'market-call');
    const q = query(
      marketCallRef,
      orderBy(sortBy, 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);

    console.log(`[API Market-call] Found ${querySnapshot.docs.length} market-call events`);

    // 모든 티커 수집 (중복 제거)
    const tickersSet = new Set<string>();
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.target_ticker) {
        tickersSet.add(data.target_ticker.toUpperCase());
      }
    });

    const tickers = Array.from(tickersSet);
    console.log(`[API Market-call] Collecting prices for ${tickers.length} unique tickers`);

    // marketcall_prices 컬렉션에서 배치로 가격 조회
    const priceMap = new Map<string, { price: number; currency: string }>();

    if (tickers.length > 0) {
      // Firestore는 in 쿼리가 최대 30개까지만 가능하므로 청크로 나눔
      const chunkSize = 30;
      for (let i = 0; i < tickers.length; i += chunkSize) {
        const chunk = tickers.slice(i, i + chunkSize);

        try {
          // 각 티커별로 개별 조회 (배치 조회)
          const pricePromises = chunk.map(async (ticker) => {
            try {
              const priceDoc = await getDoc(doc(db, 'marketcall_prices', ticker));
              if (priceDoc.exists()) {
                const data = priceDoc.data();
                return {
                  ticker,
                  price: data.price,
                  currency: data.currency || 'USD'
                };
              }
              return null;
            } catch (error) {
              console.error(`[API Market-call] Error fetching price for ${ticker}:`, error);
              return null;
            }
          });

          const prices = await Promise.all(pricePromises);
          prices.forEach((priceData) => {
            if (priceData) {
              priceMap.set(priceData.ticker, {
                price: priceData.price,
                currency: priceData.currency
              });
            }
          });
        } catch (error) {
          console.error(`[API Market-call] Error in batch price fetch:`, error);
        }
      }
    }

    console.log(`[API Market-call] Fetched ${priceMap.size} prices from marketcall_prices collection`);

    // 각 market-call 이벤트의 수익률 계산
    const events = querySnapshot.docs.map((doc) => {
      const data = doc.data();

      // created_at 변환
      let createdAtStr = '';
      if (data.created_at instanceof Timestamp) {
        createdAtStr = data.created_at.toDate().toISOString();
      } else if (typeof data.created_at === 'string') {
        createdAtStr = data.created_at;
      } else {
        createdAtStr = new Date().toISOString();
      }

      // 기본 이벤트 데이터
      const baseEvent = {
        id: doc.id,
        guru_name: data.guru_name || '',
        guru_name_kr: data.guru_name_kr || '',
        data_type: data.data_type || 'MENTION',
        event_date: data.event_date || '',
        target_ticker: data.target_ticker || null,
        company_name: data.company_name || '',
        exchange: data.exchange || '',
        source_url: data.source_url || '',
        badge_info: data.badge_info || { label: 'OPINION', intensity: 'MEDIUM' },
        title: data.title || '',
        summary: data.summary || '',
        content_html: data.content_html || '',
        tracking_data: data.tracking_data || { base_price_date: '', action_direction: 'LONG' },
        created_at: createdAtStr,
        views: data.views || 0,
        likes: data.likes || 0,
        is_closed: data.is_closed || false,
        closed_at: data.closed_at || null,
        closed_return_rate: data.closed_return_rate || null,
        closed_price: data.closed_price || null,
        author_id: data.author_id || '',
        author_email: data.author_email || '',
        author_nickname: data.author_nickname || '',
        base_price: data.base_price || 0,
        current_price: data.current_price || 0,
        return_rate: data.return_rate || 0,
      };

      // 티커와 base_price가 있고, 확정되지 않은 경우에만 실시간 수익률 계산
      if (data.target_ticker && data.base_price && !data.is_closed) {
        const tickerUpper = data.target_ticker.toUpperCase();
        const priceData = priceMap.get(tickerUpper);

        if (priceData) {
          const currentPrice = priceData.price;
          const basePrice = data.base_price;
          const actionDirection = data.tracking_data?.action_direction || 'LONG';

          // 수익률 계산
          let returnRate = 0;
          if (actionDirection === 'LONG') {
            returnRate = ((currentPrice - basePrice) / basePrice) * 100;
          } else {
            // SHORT
            returnRate = ((basePrice - currentPrice) / basePrice) * 100;
          }

          return {
            ...baseEvent,
            current_price: currentPrice,
            return_rate: parseFloat(returnRate.toFixed(2)),
          };
        }
      }

      // 실시간 업데이트 실패 시 저장된 데이터 사용
      return baseEvent;
    });

    console.log(`[API Market-call] Successfully processed ${events.length} events`);

    // 페이지네이션 적용
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedEvents = events.slice(startIndex, endIndex);
    const totalPages = Math.ceil(events.length / pageSize);

    return NextResponse.json({
      success: true,
      events: paginatedEvents,
      count: paginatedEvents.length,
      total: events.length,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error('[API Market-call] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch market-call events',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT: 마켓콜 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, userId, ...updateData } = body;

    if (!id || !userId) {
      return NextResponse.json(
        { success: false, error: 'ID and userId are required' },
        { status: 400 }
      );
    }

    // 문서 가져오기
    const docRef = doc(db, 'market-call', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // 작성자 확인
    const data = docSnap.data();
    if (data.author_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // 수정
    await updateDoc(docRef, {
      ...updateData,
      updated_at: Timestamp.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Market-call PUT] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update market-call',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE: 마켓콜 삭제
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json(
        { success: false, error: 'ID and userId are required' },
        { status: 400 }
      );
    }

    // 문서 가져오기
    const docRef = doc(db, 'market-call', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // 작성자 확인
    const data = docSnap.data();
    if (data.author_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // 삭제
    await deleteDoc(docRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Market-call DELETE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete market-call',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
