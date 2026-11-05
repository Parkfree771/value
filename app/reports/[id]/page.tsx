import { Metadata } from 'next';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { SAFETY_TTL, TAG } from '@/lib/cache';
import { sql } from '@/lib/db';
import { Report } from '@/types/report';
import { generateReportMetadata, generateReportJsonLd } from '@/lib/metadata';
import ReportDetailClient from '@/components/ReportDetailClient';
import RelatedReports from '@/components/RelatedReports';
import { notFound } from 'next/navigation';
import { getLatestPrices } from '@/lib/priceCache';
import { calculateReturn } from '@/utils/calculateReturn';

/**
 * 리포트 데이터를 가져옵니다.
 * - Postgres posts (트리거가 likes/views 카운트 자동 유지)
 * 캐시: 글마다 데이터 캐시 · 태그 posts + post:{id} (lib/cache.ts)
 *   수정·삭제 → invalidatePosts(id) 로 즉시 비움 / 좋아요·댓글 → invalidatePost(id) / 장 마감 수집 → invalidateMarket()
 *   예전엔 connection() 으로 조회마다 DB 를 읽었다 (본문 평균 20KB + 관련 리포트용 피드 전체).
 * React cache()로 generateMetadata와 페이지 간 중복 호출 방지.
 */
const getReportData = cache(async (id: string): Promise<Report | null> => {
  // 옛 Firestore id 등 uuid가 아닌 값은 조회 없이 not found (Postgres 22P02 방지)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  return unstable_cache(() => loadReport(id), ['report', id], {
    tags: [TAG.posts, TAG.post(id)],
    revalidate: SAFETY_TTL,
  })();
});

async function loadReport(id: string): Promise<Report | null> {
  {
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
                 u.nickname as author_nickname,
                 u.level_points as author_level_points
          from posts p
          left join users u on u.id = p.author_id
          where p.id = ${id}
        `,
        getLatestPrices(),
      ]);
    } catch (error) {
      // 실패는 캐시에 남기지 않는다 — throw 해서 이번 요청만 에러 페이지
      console.error('리포트 조회 오류:', error);
      throw error;
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
      levelPoints: Number(data.author_level_points ?? 0),
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
      title: '리포트를 찾을 수 없습니다',
      description: '요청하신 리포트가 존재하지 않거나 삭제되었습니다.',
      robots: { index: false, follow: true },
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

  // 없거나 삭제된 리포트 — 진짜 404 상태로 응답해야 검색엔진이 색인에서 뺀다 (200 + 안내문은 soft 404)
  if (!report) notFound();

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
// 하루짜리 안전장치 — 실제 갱신은 수정·삭제·가격 수집 때 태그로 (lib/cache.ts)
export const revalidate = 86400;

// 미리 만들어 두지 않고 처음 방문 때 만든 뒤 캐시 (ISR) — 빈 목록이어야 동적 URL 도 캐시된다.
// 갱신은 데이터가 바뀔 때 신호로 (lib/cache.ts)
export function generateStaticParams() {
  return [];
}
