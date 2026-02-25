import { Metadata } from 'next';
import { cache } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Report } from '@/types/report';
import { generateReportMetadata, generateReportJsonLd } from '@/lib/metadata';
import ReportDetailClient from '@/components/ReportDetailClient';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Link from 'next/link';

// feed.json URL
const FEED_URL = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/feed.json?alt=media`;

interface FeedPost {
  id: string;
  title: string;
  author: string;
  returnRate: number;
  currentPrice: number;
  initialPrice: number;
  views: number;
  likes: number;
  is_closed?: boolean;
  closed_return_rate?: number;
  closed_price?: number;
}

interface FeedData {
  posts: FeedPost[];
}

// feed.json 캐시 (서버 사이드)
let feedCache: { data: FeedData | null; timestamp: number } = { data: null, timestamp: 0 };
const FEED_CACHE_TTL = 60 * 1000; // 1분

/**
 * feed.json에서 최신 수익률 정보 가져오기
 */
async function getFeedPost(id: string): Promise<FeedPost | null> {
  try {
    const now = Date.now();

    // 캐시 유효하면 사용
    if (feedCache.data && (now - feedCache.timestamp) < FEED_CACHE_TTL) {
      return feedCache.data.posts.find(p => p.id === id) || null;
    }

    // feed.json 가져오기
    const response = await fetch(FEED_URL, { next: { revalidate: 60 } });
    if (!response.ok) return null;

    const data: FeedData = await response.json();
    feedCache = { data, timestamp: now };

    return data.posts.find(p => p.id === id) || null;
  } catch (error) {
    console.error('[ReportPage] feed.json 가져오기 실패:', error);
    return null;
  }
}

/**
 * 리포트 데이터를 가져옵니다.
 * - feed.json: 최신 수익률, 현재가, 조회수, 좋아요
 * - Firestore: content, stockData 등 상세 정보
 * React cache()로 generateMetadata와 페이지 컴포넌트 간 중복 호출 방지
 */
const getReportData = cache(async (id: string): Promise<Report | null> => {
  try {
    // 1. Firestore에서 상세 정보 가져오기
    const docRef = doc(db, 'posts', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();

    // 2. feed.json에서 최신 수익률 정보 가져오기
    const feedPost = await getFeedPost(id);

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
        updatedAtArray = data.updatedAt.map((item: any) => {
          if (item instanceof Timestamp) {
            return item.toDate().toISOString().split('T')[0];
          } else if (typeof item === 'string') {
            return item;
          }
          return '';
        }).filter((date: string) => date !== '');
      } else if (data.updatedAt instanceof Timestamp) {
        updatedAtArray = [data.updatedAt.toDate().toISOString().split('T')[0]];
      } else if (typeof data.updatedAt === 'string') {
        updatedAtArray = [data.updatedAt];
      }
    }

    // 3. 데이터 조합 (feed.json 수익률 우선, Firestore 상세 정보)
    const report: Report = {
      id: docSnap.id,
      title: data.title || '',
      author: data.authorName || '익명',
      authorId: data.authorId || '',
      stockName: data.stockName || '',
      ticker: data.ticker || '',
      opinion: data.opinion || 'hold',
      // feed.json에서 최신 수익률/현재가 사용 (없으면 Firestore 값)
      returnRate: feedPost?.returnRate ?? data.returnRate ?? 0,
      initialPrice: feedPost?.initialPrice ?? data.initialPrice ?? 0,
      currentPrice: feedPost?.currentPrice ?? data.currentPrice ?? 0,
      targetPrice: data.targetPrice || 0,
      createdAt: createdAtStr,
      updatedAt: updatedAtArray.length > 0 ? updatedAtArray : undefined,
      // feed.json에서 최신 조회수/좋아요 사용
      views: feedPost?.views ?? data.views ?? 0,
      likes: feedPost?.likes ?? data.likes ?? 0,
      // Firestore에서만 가져오는 상세 정보
      mode: data.mode || 'text',
      content: data.content || '',
      cssContent: data.cssContent || '',
      images: data.images || [],
      files: data.files || [],
      positionType: data.positionType || 'long',
      stockData: data.stockData || {},
      // 확정 상태
      is_closed: feedPost?.is_closed ?? data.is_closed ?? false,
      closed_at: data.closed_at,
      closed_return_rate: feedPost?.closed_return_rate ?? data.closed_return_rate,
      closed_price: feedPost?.closed_price ?? data.closed_price,
      // 물타기 데이터
      entries: data.entries || undefined,
      avgPrice: data.avgPrice || undefined,
    };

    // 확정된 수익률이 있으면 사용
    if (report.is_closed) {
      if (report.closed_return_rate !== undefined) {
        report.returnRate = report.closed_return_rate;
      }
      if (report.closed_price !== undefined) {
        report.currentPrice = report.closed_price;
      }
    }

    return report;
  } catch (error) {
    console.error('리포트 가져오기 실패:', error);
    return null;
  }
});

/**
 * 동적 메타데이터 생성 (SEO)
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const report = await getReportData(resolvedParams.id);

  if (!report) {
    return {
      title: '리포트를 찾을 수 없습니다 - AntStreet',
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
