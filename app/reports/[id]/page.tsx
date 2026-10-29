import { Metadata } from 'next';
import { cache } from 'react';
import { connection } from 'next/server';
import { sql } from '@/lib/db';
import { Report } from '@/types/report';
import { generateReportMetadata, generateReportJsonLd } from '@/lib/metadata';
import ReportDetailClient from '@/components/ReportDetailClient';
import RelatedReports from '@/components/RelatedReports';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Link from 'next/link';
import { getLatestPrices } from '@/lib/priceCache';
import { calculateReturn } from '@/utils/calculateReturn';

/**
 * 리포트 데이터를 가져옵니다.
 * - Postgres posts (트리거가 likes/views 카운트 자동 유지)
 * - feed.json은 가격 캐시 (cron이 갱신)
 * React cache()로 generateMetadata와 페이지 간 중복 호출 방지.
 */
const getReportData = cache(async (id: string): Promise<Report | null> => {
  // 요청 시점 렌더링 유지 — 옛 코드는 cookies() 호출로 동적 렌더링이었음.
  // 이게 없으면 revalidate=3600 ISR로 바뀌어 삭제/수정된 글이 최대 1시간 캐시됨.
  // (try 밖에서 호출 — Next의 dynamic 신호 에러를 catch가 삼키지 않도록)
  await connection();

  try {
    // 옛 Firestore id 등 uuid가 아닌 값은 조회 없이 not found (Postgres 22P02 방지)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;

    // updated_at(timestamptz[])은 드라이버가 Date[]로 파싱 → to_json으로 ISO 문자열 배열 유지
    let rows: Record<string, any>[];
    let latestPrices: Awaited<ReturnType<typeof getLatestPrices>>;
    try {
      [rows, latestPrices] = await Promise.all([
        sql`
          select p.id, p.title, p.ticker, p.exchange, p.opinion, p.position_type, p.initial_price,
                 p.current_price, p.target_price, p.return_rate, p.themes, p.stock_name, p.stock_data,
                 p.mode, p.content, p.css_content, p.images, p.files, p.views, p.likes, p.created_at,
                 to_json(p.updated_at) as updated_at, p.author_id,
                 u.nickname as author_nickname, u.equipped_badge_id as author_equipped_badge_id
          from posts p
          left join users u on u.id = p.author_id
          where p.id = ${id}
        `,
        getLatestPrices(),
      ]);
    } catch (error) {
      console.error('리포트 조회 오류:', error);
      return null;
    }
    const data = rows[0];
    if (!data) return null;

    const tickerUpper = (data.ticker || '').toUpperCase();
    const initialPrice = Number(data.initial_price ?? 0);
    // 글 row의 current_price 우선. cache는 row가 0/null인 비정상 케이스의 backup.
    const currentPrice = Number(data.current_price) || latestPrices[tickerUpper]?.currentPrice || 0;
    const positionType: 'long' | 'short' = (data.position_type as 'long' | 'short') ?? 'long';
    const returnRate =
      initialPrice && currentPrice
        ? parseFloat(calculateReturn(initialPrice, currentPrice, positionType).toFixed(2))
        : Number(data.return_rate ?? 0);

    const createdAtStr =
      typeof data.created_at === 'string'
        ? data.created_at.split('T')[0]
        : new Date().toISOString().split('T')[0];

    // updated_at는 timestamptz[] (스키마) — 날짜만 추출
    const updatedAtArray: string[] = Array.isArray(data.updated_at)
      ? data.updated_at
          .map((d: unknown) => (typeof d === 'string' ? d.split('T')[0] : ''))
          .filter((s) => s !== '')
      : [];

    const report: Report = {
      id: data.id,
      title: data.title ?? '',
      author: data.author_nickname ?? '익명',
      authorId: data.author_id,
      equippedBadgeId: data.author_equipped_badge_id ?? null,
      stockName: data.stock_name ?? '',
      ticker: data.ticker ?? '',
      opinion: data.opinion ?? 'hold',
      returnRate,
      initialPrice,
      currentPrice,
      targetPrice: Number(data.target_price ?? 0),
      createdAt: createdAtStr,
      updatedAt: updatedAtArray.length > 0 ? updatedAtArray : undefined,
      views: data.views ?? 0,
      likes: data.likes ?? 0,
      mode: data.mode ?? 'text',
      content: data.content ?? '',
      cssContent: data.css_content ?? '',
      images: data.images ?? [],
      files: data.files ?? [],
      positionType,
      stockData: data.stock_data ?? {},
      themes: data.themes ?? undefined,
    };

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
      title: '리포트를 찾을 수 없습니다',
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

      {/* 클라이언트 컴포넌트에서 실제 UI 렌더링 (관련 리포트는 서버에서 렌더링하여 SEO 대응) */}
      <ReportDetailClient
        report={report}
        relatedReports={
          <RelatedReports
            currentId={report.id}
            ticker={report.ticker}
            stockName={report.stockName}
            author={report.author}
            themes={report.themes}
          />
        }
      />
    </>
  );
}

/**
 * 정적 생성을 위한 설정 (옵션)
 * revalidate: 3600 => 1시간마다 페이지 재생성 (ISR)
 */
export const revalidate = 3600; // 1시간
