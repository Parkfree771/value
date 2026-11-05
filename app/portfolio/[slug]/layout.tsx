import type { Metadata } from 'next';
import { GURU_LIST } from '@/app/guru-tracker/types';
import { formatRate, ogCardUrl } from '@/lib/metadata';
import { formatUsd, quarterLabel } from '@/lib/sec13f/format';
import {
  loadGuruPortfolios,
  loadGuruPrices,
  summarizeGuruPortfolio,
  type GuruPortfolioSummary,
} from '@/lib/sec13f/portfolioSummary';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

function getGuruBySlug(slug: string) {
  const guruNameEn = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return GURU_LIST.find(g => g.name_en === guruNameEn);
}

async function getSummary(slug: string): Promise<GuruPortfolioSummary | null> {
  const doc = loadGuruPortfolios()[slug];
  return doc ? summarizeGuruPortfolio(doc, await loadGuruPrices()) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guru = getGuruBySlug(slug);

  if (!guru) {
    return {
      title: '구루를 찾을 수 없습니다',
      robots: { index: false, follow: true },
    };
  }

  const summary = await getSummary(slug);
  const quarter = summary ? quarterLabel(summary.reportDate) : '';
  const since = summary?.returnSinceFiling ?? null;

  // 제목: 워렌 버핏 포트폴리오 2026년 2분기 13F · 공시 후 +4.2% — Berkshire Hathaway 보유 종목
  const title = summary
    ? `${guru.name_kr} 포트폴리오 ${quarter} 13F${since !== null ? ` · 공시 후 ${formatRate(since)}` : ''} — ${guru.filing_name} 보유 종목`
    : `${guru.name_kr}(${guru.name_en}) 포트폴리오 · ${guru.filing_name} 13F 보유 종목`;

  // 설명: 수익률 → 상위 종목(비중·공시 후 수익률) → 이번 분기 매매 → 규모
  const topLine = summary?.top
    .map((h) => `${h.ticker} ${h.weight.toFixed(1)}%${h.returnRate !== null ? `(${formatRate(h.returnRate)})` : ''}`)
    .join(', ');
  const description = summary
    ? [
        `${guru.name_kr}(${guru.name_en}) ${guru.filing_name} ${quarter} SEC 13F 포트폴리오.`,
        since !== null ? `공시일 이후 수익률 ${formatRate(since)}.` : '',
        topLine ? `상위 종목 ${topLine}.` : '',
        summary.newBuys.length ? `신규 매수 ${summary.newBuys.slice(0, 4).join('·')}.` : '',
        summary.soldOut.length ? `전량 매도 ${summary.soldOut.slice(0, 4).join('·')}.` : '',
        `총 ${summary.holdingsCount}종목 ${formatUsd(summary.totalValue)}.`,
      ]
        .filter(Boolean)
        .join(' ')
    : `${guru.name_kr}(${guru.name_en}) ${guru.filing_name}의 SEC 13F 공시 기반 포트폴리오 한국어 추적. 보유 종목, 신규 매수, 전량 매도, 비중 변화를 분기마다 업데이트. 투자 스타일: ${guru.style}. ${guru.catchphrase}`;

  const ogImage = ogCardUrl({
    kicker: summary ? `13F 포트폴리오 · ${quarter}` : '13F 포트폴리오',
    title: guru.name_kr,
    sub: summary
      ? `${guru.filing_name} · ${summary.holdingsCount}종목 · ${formatUsd(summary.totalValue)}`
      : guru.filing_name,
    metrics: summary
      ? [
          ...(since !== null ? [{ label: '공시 후 수익률', value: formatRate(since) }] : []),
          ...summary.top.slice(0, since !== null ? 2 : 3).map((h) => ({
            label: `${h.ticker} 비중`,
            value: `${h.weight.toFixed(1)}%`,
          })),
        ]
      : [],
  });

  return {
    title,
    description,
    keywords: [
      // 구루 정체성 (한·영·법인명)
      guru.name_kr, guru.name_en, guru.filing_name,
      // 구루 + 의도 키워드 조합 (long-tail 핵심)
      `${guru.name_kr} 포트폴리오`, `${guru.name_kr} 보유 종목`, `${guru.name_kr} 13F`,
      `${guru.name_kr} 최근 매수`, `${guru.name_kr} 매도`, `${guru.name_kr} 비중`, `${guru.name_kr} 수익률`,
      `${guru.name_en} portfolio`, `${guru.name_en} 13F`, `${guru.name_en} holdings`,
      `${guru.filing_name} 13F`, `${guru.filing_name} portfolio`,
      // 이번 분기 · 대표 보유 종목 (예: "워렌 버핏 2026년 2분기", "워렌 버핏 AAPL")
      ...(quarter ? [`${guru.name_kr} ${quarter}`, `${guru.name_kr} ${quarter} 13F`] : []),
      ...(summary?.top.map((h) => `${guru.name_kr} ${h.ticker}`) ?? []),
      // 구루 고유 검색어 (관련 회사·동료·대표종목 — 각 구루별로 types.ts에 정의)
      ...(guru.seo_keywords ?? []),
      // 카테고리·일반
      '13F', 'SEC 13F', '일삼에프', '13F 공시', '13F 한국어',
      '구루 포트폴리오', '투자 대가 포트폴리오', '헤지펀드 포트폴리오',
      guru.style, '가치투자', 'AntStreet', '앤트스트릿',
    ],
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${SITE_URL}/portfolio/${slug}`,
      siteName: 'AntStreet',
      locale: 'ko_KR',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${guru.name_kr} ${quarter} 13F 포트폴리오` }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    alternates: {
      canonical: `${SITE_URL}/portfolio/${slug}`,
    },
  };
}

function buildJsonLd(slug: string, summary: GuruPortfolioSummary | null) {
  const guru = getGuruBySlug(slug);
  if (!guru) return null;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${SITE_URL}/portfolio/${slug}#person`,
        name: guru.name_kr,
        alternateName: [guru.name_en],
        nationality: 'US',
        jobTitle: '투자자',
        affiliation: {
          '@type': 'Organization',
          name: guru.filing_name,
          identifier: guru.cik,
        },
        description: `${guru.style} - ${guru.catchphrase}`,
        knowsAbout: ['투자', '주식', '13F', guru.style, '가치투자'],
        image: `${SITE_URL}/${guru.image_filename}`,
        url: `${SITE_URL}/portfolio/${slug}`,
      },
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/portfolio/${slug}#page`,
        url: `${SITE_URL}/portfolio/${slug}`,
        name: `${guru.name_kr} 13F 포트폴리오`,
        description: `${guru.filing_name} SEC 13F 공시 기반 보유 종목·매매 내역`,
        about: { '@id': `${SITE_URL}/portfolio/${slug}#person` },
        inLanguage: 'ko-KR',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        ...(summary
          ? {
              dateModified: summary.filingDate,
              // 상위 보유 종목 — 비중 · 공시 후 수익률
              mainEntity: {
                '@type': 'ItemList',
                name: `${guru.name_kr} 상위 보유 종목`,
                numberOfItems: summary.holdingsCount,
                itemListElement: summary.top.map((h, i) => ({
                  '@type': 'ListItem',
                  position: i + 1,
                  name: `${h.name} (${h.ticker}) 비중 ${h.weight.toFixed(1)}%${
                    h.returnRate !== null ? ` · 공시 후 ${formatRate(h.returnRate)}` : ''
                  }`,
                })),
              },
            }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: '구루 포트폴리오', item: `${SITE_URL}/guru-tracker` },
          { '@type': 'ListItem', position: 3, name: guru.name_kr },
        ],
      },
    ],
  };
}

export default async function PortfolioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const jsonLd = buildJsonLd(slug, await getSummary(slug));

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
