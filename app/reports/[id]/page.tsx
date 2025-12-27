import { Metadata } from 'next';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Report } from '@/types/report';
import { updateReportReturnRate } from '@/lib/stockPrice';
import { generateReportMetadata, generateReportJsonLd } from '@/lib/metadata';
import ReportDetailClient from '@/components/ReportDetailClient';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Link from 'next/link';

/**
 * 리포트 ID로 Firestore에서 리포트 데이터를 가져옵니다.
 */
async function getReportData(id: string): Promise<Report | null> {
  try {
    const docRef = doc(db, 'posts', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();

    // createdAt을 문자열로 변환
    let createdAtStr = '';
    if (data.createdAt instanceof Timestamp) {
      createdAtStr = data.createdAt.toDate().toISOString().split('T')[0];
    } else if (typeof data.createdAt === 'string') {
      createdAtStr = data.createdAt;
    } else {
      createdAtStr = new Date().toISOString().split('T')[0];
    }

    // updatedAt을 문자열 배열로 변환
    let updatedAtArray: string[] = [];
    if (data.updatedAt) {
      if (Array.isArray(data.updatedAt)) {
        // 이미 배열인 경우
        updatedAtArray = data.updatedAt.map((item: any) => {
          if (item instanceof Timestamp) {
            return item.toDate().toISOString().split('T')[0];
          } else if (typeof item === 'string') {
            return item;
          }
          return '';
        }).filter((date: string) => date !== '');
      } else if (data.updatedAt instanceof Timestamp) {
        // Timestamp인 경우 (기존 데이터 호환)
        updatedAtArray = [data.updatedAt.toDate().toISOString().split('T')[0]];
      } else if (typeof data.updatedAt === 'string') {
        // 문자열인 경우 (기존 데이터 호환)
        updatedAtArray = [data.updatedAt];
      }
    }

    const report: Report = {
      id: docSnap.id,
      title: data.title || '',
      author: data.authorName || '익명',
      authorId: data.authorId || '',
      stockName: data.stockName || '',
      ticker: data.ticker || '',
      opinion: data.opinion || 'hold',
      returnRate: data.returnRate || 0,
      initialPrice: data.initialPrice || 0,
      currentPrice: data.currentPrice || 0,
      targetPrice: data.targetPrice || 0,
      createdAt: createdAtStr,
      updatedAt: updatedAtArray.length > 0 ? updatedAtArray : undefined,
      views: data.views || 0,
      likes: data.likes || 0,
      mode: data.mode || 'text',
      content: data.content || '',
      cssContent: data.cssContent || '',
      images: data.images || [],
      files: data.files || [],
      positionType: data.positionType || 'long',
      stockData: data.stockData || {},
      is_closed: data.is_closed || false,
      closed_at: data.closed_at,
      closed_return_rate: data.closed_return_rate,
      closed_price: data.closed_price,
    };

    // 실시간 주가 및 수익률 업데이트 (확정되지 않은 경우에만)
    if (!report.is_closed && report.ticker && report.initialPrice) {
      console.log(`[ReportPage] 수익률 업데이트 시도:`, {
        id: docSnap.id,
        ticker: report.ticker,
        initialPrice: report.initialPrice,
        positionType: report.positionType
      });

      const updatedData = await updateReportReturnRate(
        report.ticker,
        report.initialPrice,
        report.positionType
      );

      if (updatedData) {
        console.log(`[ReportPage] 수익률 업데이트 성공:`, updatedData);
        report.currentPrice = updatedData.currentPrice;
        report.returnRate = updatedData.returnRate;
        report.stockData = {
          ...report.stockData,
          ...updatedData.stockData,
        };
      } else {
        console.error(`[ReportPage] 수익률 업데이트 실패 - updatedData가 null`);
      }
    } else if (report.is_closed) {
      console.log(`[ReportPage] 수익률 업데이트 건너뛰기 - 이미 확정됨:`, {
        id: docSnap.id,
        closed_at: report.closed_at,
        closed_return_rate: report.closed_return_rate
      });
      // 확정된 수익률 사용
      if (report.closed_return_rate !== undefined) {
        report.returnRate = report.closed_return_rate;
      }
      if (report.closed_price !== undefined) {
        report.currentPrice = report.closed_price;
      }
    } else {
      console.warn(`[ReportPage] 수익률 업데이트 건너뛰기:`, {
        id: docSnap.id,
        ticker: report.ticker,
        initialPrice: report.initialPrice,
        hasTicker: !!report.ticker,
        hasInitialPrice: !!report.initialPrice
      });
    }

    return report;
  } catch (error) {
    console.error('리포트 가져오기 실패:', error);
    return null;
  }
}

/**
 * 동적 메타데이터 생성 (SEO)
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const report = await getReportData(resolvedParams.id);

  if (!report) {
    return {
      title: '리포트를 찾을 수 없습니다 - 워렌버핏 따라잡기',
      description: '요청하신 리포트가 존재하지 않거나 삭제되었습니다.',
    };
  }

  return generateReportMetadata(report, report.returnRate);
}

/**
 * 리포트 상세 페이지 (서버 컴포넌트)
 */
export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const report = await getReportData(resolvedParams.id);

  // 리포트를 찾지 못한 경우
  if (!report) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            리포트를 찾을 수 없습니다
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            요청하신 리포트가 존재하지 않거나 삭제되었습니다.
          </p>
          <Link href="/">
            <Button>홈으로 돌아가기</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // JSON-LD 구조화된 데이터 생성
  const jsonLd = generateReportJsonLd(report, report.returnRate);

  return (
    <>
      {/* JSON-LD 구조화된 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      {/* 클라이언트 컴포넌트에서 실제 UI 렌더링 */}
      <ReportDetailClient report={report} />
    </>
  );
}

/**
 * 정적 생성을 위한 설정 (옵션)
 * revalidate: 3600 => 1시간마다 페이지 재생성 (ISR)
 */
export const revalidate = 3600; // 1시간

/**
 * 동적 라우트 파라미터 생성 (옵션)
 * 빌드 시 미리 생성할 페이지 목록
 */
// export async function generateStaticParams() {
//   // Firestore에서 모든 리포트 ID 가져오기
//   const postsSnapshot = await getDocs(collection(db, 'posts'));
//   return postsSnapshot.docs.map((doc) => ({
//     id: doc.id,
//   }));
// }
