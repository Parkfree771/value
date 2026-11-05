import type { Metadata } from 'next';
import Container from '@/components/Container';
import { getFeedData } from '@/lib/feedData';
import { formatRate, ogCardUrl, seoStockName, SITE_URL } from '@/lib/metadata';
import ReportsClient from './ReportsClient';

export const revalidate = 86400; // 하루짜리 안전장치 — 실제 갱신은 데이터가 바뀔 때 신호로 (lib/cache.ts)

export async function generateMetadata(): Promise<Metadata> {
  const posts = (await getFeedData())?.posts ?? [];
  const sorted = [...posts].filter((p) => Number.isFinite(p.returnRate)).sort((a, b) => b.returnRate - a.returnRate);
  const top = sorted.slice(0, 3);
  const avg = posts.length ? posts.reduce((s, p) => s + (p.returnRate || 0), 0) / posts.length : 0;

  const title = top[0]
    ? `개인 리포트 · 수익률 1위 ${formatRate(top[0].returnRate)} ${seoStockName(top[0].stockName, top[0].ticker)}`
    : '개인 리포트 · 수익률 순위';
  const description = [
    '개인 투자자가 쓴 주식 리포트를 작성가 대비 수익률로 줄 세웁니다.',
    top.length
      ? `지금 1위 ${top.map((p) => `${seoStockName(p.stockName, p.ticker)} ${formatRate(p.returnRate)}`).join(', ')}.`
      : '',
    posts.length ? `리포트 ${posts.length}개 · 평균 ${formatRate(avg)}.` : '',
    '국내·해외, 수익률 높은순·낮은순·최신·인기순으로 볼 수 있습니다.',
  ]
    .filter(Boolean)
    .join(' ');
  const ogImage = ogCardUrl({
    kicker: '개인 리포트 · 장 마감 기준',
    title: '개인 리포트 수익률',
    sub: '작성가 대비 현재가 · 매일 갱신',
    metrics: top.map((p, i) => ({ label: `${i + 1}위 ${seoStockName(p.stockName, p.ticker)}`, value: formatRate(p.returnRate) })),
  });

  return {
    title,
    description,
    keywords: ['개인 투자자 리포트', '주식 리포트', '종목 분석', '수익률 순위', '리포트 수익률', '수익률 인증', 'AntStreet', '앤트스트릿'],
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${SITE_URL}/reports`,
      siteName: 'AntStreet',
      locale: 'ko_KR',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    alternates: { canonical: `${SITE_URL}/reports` },
  };
}

export default async function ReportsPage() {
  const posts = (await getFeedData())?.posts ?? [];
  const top = [...posts].filter((p) => Number.isFinite(p.returnRate)).sort((a, b) => b.returnRate - a.returnRate).slice(0, 20);
  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '개인 리포트 수익률 순위',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: top.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/reports/${p.id}`,
      name: `${seoStockName(p.stockName, p.ticker)} ${formatRate(p.returnRate)} · ${p.title}`.slice(0, 110),
    })),
  };

  return (
    <Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />
      <h1 className="sr-only">개인 리포트 — 수익률 순위</h1>
      <ReportsClient posts={posts} />
      <p className="mt-8 text-center text-[11px] leading-relaxed text-[var(--theme-ink-soft)] break-keep">
        작성가는 리포트 작성 당시 가격, 현재가는 장 마감 후 매일 갱신됩니다. 투자 권유가 아닙니다.
      </p>
    </Container>
  );
}
