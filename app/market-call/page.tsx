import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp, getCountFromServer } from 'firebase/firestore';
import { getLatestPrices } from '@/lib/priceCache';
import MarketCallClient from '@/components/MarketCallClient';
import { GuruTrackingEvent } from '@/app/guru-tracker/types';

// ISR: 5분마다 재생성 (On-Demand Revalidation으로 즉시 갱신 가능)
export const revalidate = 300;

// 서버에서 데이터 페칭 + 수익률 계산
async function getMarketCallEvents(): Promise<{ events: GuruTrackingEvent[]; total: number }> {
  try {
    const marketCallRef = collection(db, 'market-call');
    const q = query(marketCallRef, orderBy('created_at', 'desc'), limit(50));

    // 병렬로 데이터 가져오기
    const [querySnapshot, countSnapshot, latestPrices] = await Promise.all([
      getDocs(q),
      getCountFromServer(query(marketCallRef)),
      getLatestPrices()
    ]);

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

      // 수익률 계산 (서버에서 처리)
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
      } as GuruTrackingEvent;
    });

    return {
      events,
      total: countSnapshot.data().count,
    };
  } catch (error) {
    console.error('[ISR Market-call] Failed to fetch events:', error);
    return { events: [], total: 0 };
  }
}

export default async function MarketCallPage() {
  const { events, total } = await getMarketCallEvents();

  // 클라이언트 컴포넌트에 초기 데이터 전달
  return <MarketCallClient initialEvents={events} total={total} />;
}
