import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp, getDoc, doc, updateDoc, deleteDoc, startAfter, getCountFromServer } from 'firebase/firestore';
import { getLatestPrices } from '@/lib/priceCache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10', 10), 50); // 최대 50개 제한
    const cursor = searchParams.get('cursor'); // 커서 기반 페이지네이션

    console.log(`[API Market-call] Fetching market-call - sortBy: ${sortBy}, pageSize: ${pageSize}, cursor: ${cursor}`);

    const marketCallRef = collection(db, 'market-call');

    // 쿼리 구성
    let q;
    if (cursor) {
      const cursorDoc = await getDoc(doc(db, 'market-call', cursor));
      if (cursorDoc.exists()) {
        q = query(
          marketCallRef,
          orderBy(sortBy, 'desc'),
          startAfter(cursorDoc),
          limit(pageSize)
        );
      } else {
        q = query(marketCallRef, orderBy(sortBy, 'desc'), limit(pageSize));
      }
    } else {
      q = query(marketCallRef, orderBy(sortBy, 'desc'), limit(pageSize));
    }

    // 병렬로 데이터와 총 개수 가져오기
    const [querySnapshot, countSnapshot, latestPrices] = await Promise.all([
      getDocs(q),
      getCountFromServer(query(marketCallRef)),
      getLatestPrices()
    ]);

    console.log(`[API Market-call] Found ${querySnapshot.docs.length} market-call events`);

    // 각 market-call 이벤트의 수익률 계산
    const events = querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();

      // created_at 변환
      let createdAtStr = '';
      if (data.created_at instanceof Timestamp) {
        createdAtStr = data.created_at.toDate().toISOString();
      } else if (typeof data.created_at === 'string') {
        createdAtStr = data.created_at;
      } else {
        createdAtStr = new Date().toISOString();
      }

      const basePrice = data.initial_price || data.base_price || 0;
      const ticker = (data.target_ticker || data.ticker || '').toUpperCase();
      const jsonPrice = latestPrices[ticker]?.currentPrice;
      const currentPrice = jsonPrice || data.currentPrice || data.current_price || 0;
      const actionDirection = data.tracking_data?.action_direction || 'LONG';

      let returnRate = 0;
      if (!data.is_closed && basePrice > 0 && currentPrice > 0) {
        if (actionDirection === 'LONG') {
          returnRate = ((currentPrice - basePrice) / basePrice) * 100;
        } else {
          returnRate = ((basePrice - currentPrice) / basePrice) * 100;
        }
      } else if (data.is_closed) {
        returnRate = data.closed_return_rate || 0;
      }

      return {
        id: docSnap.id,
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
        base_price: basePrice,
        current_price: currentPrice,
        return_rate: parseFloat(returnRate.toFixed(2)),
      };
    });

    // 다음 페이지 커서
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
    const nextCursor = lastDoc ? lastDoc.id : null;
    const hasMore = querySnapshot.docs.length === pageSize;

    console.log(`[API Market-call] Successfully processed ${events.length} events`);

    const response = NextResponse.json({
      success: true,
      events,
      count: events.length,
      total: countSnapshot.data().count,
      nextCursor,
      hasMore,
      pageSize,
    });

    // 캐시 헤더 추가
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    return response;
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
    // 토큰 검증
    const { verifyAuthToken } = await import('@/lib/firebase-admin');
    const authHeader = request.headers.get('authorization');
    const verifiedUserId = await verifyAuthToken(authHeader);

    if (!verifiedUserId) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
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

    // 작성자 확인 (서버에서 검증된 userId 사용)
    const data = docSnap.data();
    if (data.author_id !== verifiedUserId) {
      return NextResponse.json(
        { success: false, error: '본인의 글만 수정할 수 있습니다.' },
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
    // 토큰 검증
    const { verifyAuthToken } = await import('@/lib/firebase-admin');
    const authHeader = request.headers.get('authorization');
    const verifiedUserId = await verifyAuthToken(authHeader);

    if (!verifiedUserId) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
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

    // 작성자 확인 (서버에서 검증된 userId 사용)
    const data = docSnap.data();
    if (data.author_id !== verifiedUserId) {
      return NextResponse.json(
        { success: false, error: '본인의 글만 삭제할 수 있습니다.' },
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
