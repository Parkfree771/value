import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp, getCountFromServer } from 'firebase/firestore';
import { getLatestPrices } from '@/lib/priceCache';
import { calculateReturn } from '@/utils/calculateReturn';
import { ReportSummary } from '@/types/report';
import HomeClient from '@/components/HomeClient';

// ISR: 1초마다 재생성 (요청 시)
export const revalidate = 1;

// 서버에서 데이터 페칭 + 수익률 계산
async function getReports(): Promise<{ reports: ReportSummary[]; total: number }> {
  try {
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'), limit(50));

    // 병렬로 데이터 가져오기
    const [querySnapshot, countSnapshot, latestPrices] = await Promise.all([
      getDocs(q),
      getCountFromServer(query(postsRef)),
      getLatestPrices()
    ]);

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

      // 수익률 계산 (서버에서 처리)
      const returnRate = (initialPrice > 0 && currentPrice > 0)
        ? calculateReturn(initialPrice, currentPrice, positionType as 'long' | 'short')
        : 0;

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
        positionType,
        stockData: data.stockData || null,
      };
    });

    return {
      reports,
      total: countSnapshot.data().count,
    };
  } catch (error) {
    console.error('[ISR] Failed to fetch reports:', error);
    return { reports: [], total: 0 };
  }
}

export default async function HomePage() {
  const { reports, total } = await getReports();

  // 클라이언트 컴포넌트에 초기 데이터 전달
  return <HomeClient initialReports={reports} total={total} />;
}
