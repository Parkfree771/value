import { NextRequest, NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp, getDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
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
    console.log(`[Market-call API] Loaded ${Object.keys(cachedPrices || {}).length} prices from JSON`);
    return cachedPrices || {};
  } catch (error) {
    console.error('[Market-call API] Failed to load prices JSON:', error);
    return cachedPrices || {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sortBy') || 'created_at'; // created_at, return_rate, views
    const limitCount = parseInt(searchParams.get('limit') || '20', 10); // 50 → 20 최적화
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

    // JSON에서 최신 가격 가져오기
    const latestPrices = await getLatestPrices();

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

      // initial_price 또는 base_price 처리 (필드명 통일)
      const basePrice = data.initial_price || data.base_price || 0;

      // JSON에서 최신 가격 가져오기 (없으면 Firestore 값 사용)
      const ticker = (data.target_ticker || data.ticker || '').toUpperCase();
      const jsonPrice = latestPrices[ticker]?.currentPrice;
      const currentPrice = jsonPrice || data.currentPrice || data.current_price || 0;

      const actionDirection = data.tracking_data?.action_direction || 'LONG';

      // 확정되지 않은 경우에만 수익률 계산
      let returnRate = 0;
      if (!data.is_closed && basePrice > 0 && currentPrice > 0) {
        if (actionDirection === 'LONG') {
          returnRate = ((currentPrice - basePrice) / basePrice) * 100;
        } else {
          // SHORT
          returnRate = ((basePrice - currentPrice) / basePrice) * 100;
        }
      } else if (data.is_closed) {
        // 확정된 경우 저장된 수익률 사용
        returnRate = data.closed_return_rate || 0;
      }

      return {
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
        base_price: basePrice,
        current_price: currentPrice,
        return_rate: parseFloat(returnRate.toFixed(2)),
      };
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
