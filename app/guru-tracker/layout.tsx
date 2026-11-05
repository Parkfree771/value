import type { Metadata } from 'next';
import { GURU_LIST } from './types';
import { formatRate, ogCardUrl } from '@/lib/metadata';
import { quarterLabel } from '@/lib/sec13f/format';
import { loadGuruPortfolios, loadGuruPrices, summarizeGuruPortfolio } from '@/lib/sec13f/portfolioSummary';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

// 메타데이터·구조화 데이터에 공시 후 수익률(guru_prices, 매일 cron 갱신)이 들어가므로 1시간 ISR
export const revalidate = 86400; // 하루짜리 안전장치 — 실제 갱신은 데이터가 바뀔 때 신호로 (lib/cache.ts)

const guruSlug = (nameEn: string) => nameEn.toLowerCase().replace(/\s+/g, '-');

async function getGuruSummaries() {
  const [portfolios, prices] = [loadGuruPortfolios(), await loadGuruPrices()];
  return GURU_LIST.map((guru) => {
    const doc = portfolios[guruSlug(guru.name_en)];
    return { guru, summary: doc ? summarizeGuruPortfolio(doc, prices, 3) : null };
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const rows = await getGuruSummaries();
  const latest = rows
    .map((r) => r.summary?.reportDate)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);
  const quarter = latest ? quarterLabel(latest) : '';
  const names = GURU_LIST.map((g) => g.name_kr);

  // 공시 후 수익률이 가장 좋은 구루 — 설명·OG 카드 첫 지표
  const ranked = rows
    .filter((r) => r.summary?.returnSinceFiling != null)
    .sort((a, b) => (b.summary!.returnSinceFiling as number) - (a.summary!.returnSinceFiling as number));
  const best = ranked[0];

  const title = `13F 구루 포트폴리오${quarter ? ` ${quarter}` : ''} · 워렌 버핏 · 빌 애크먼 · 하워드 막스 등 ${GURU_LIST.length}명 한국어 추적`;
  const description = [
    `SEC 13F 공시 기반 투자 대가 ${GURU_LIST.length}명의${quarter ? ` ${quarter}` : ''} 포트폴리오를 한국어로.`,
    best
      ? `공시 후 수익률 1위 ${best.guru.name_kr} ${formatRate(best.summary!.returnSinceFiling as number)}.`
      : '',
    `${names.join('·')}의 신규 매수·전량 매도·비중 변화와 공시일 이후 수익률을 한눈에.`,
  ]
    .filter(Boolean)
    .join(' ');

  const ogImage = ogCardUrl({
    kicker: `SEC 13F${quarter ? ` · ${quarter}` : ''}`,
    title: '구루 포트폴리오',
    sub: `투자 대가 ${GURU_LIST.length}명이 사고 판 종목`,
    metrics: ranked.slice(0, 3).map((r) => ({
      label: r.guru.name_kr,
      value: formatRate(r.summary!.returnSinceFiling as number),
    })),
  });

  return {
    title,
    description,
    keywords: [
      // 13F 카테고리
      '13F', '13F 공시', '일삼에프', 'SEC 13F', '13F filing', '13F 포트폴리오',
      '13F 한국어', '13F tracker', '포트폴리오 추적',
      ...(quarter ? [`13F ${quarter}`, `${quarter} 13F 공시`] : []),
      // 구루 한·영 풀세트
      ...GURU_LIST.flatMap((g) => [g.name_kr, g.name_en, g.filing_name, `${g.name_kr} 포트폴리오`]),
      '찰리 멍거', 'Charlie Munger',
      // 일반
      '구루 포트폴리오', '투자 대가 포트폴리오', '헤지펀드 포트폴리오', '구루 수익률',
      'guru portfolio', 'hedge fund 13F', '가치투자',
    ],
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${SITE_URL}/guru-tracker`,
      siteName: 'AntStreet',
      locale: 'ko_KR',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `13F 구루 포트폴리오 ${quarter}` }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    alternates: {
      canonical: `${SITE_URL}/guru-tracker`,
    },
  };
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '13F 공시란 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '13F 공시는 미국 SEC에 제출하는 분기별 보유 종목 보고서입니다. 운용자산 1억 달러 이상의 기관 투자자는 의무적으로 보유 주식을 공개해야 합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '어떤 투자 대가의 포트폴리오를 볼 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${GURU_LIST.map((g) => `${g.name_kr}(${g.filing_name})`).join(', ')}의 포트폴리오를 추적합니다.`,
      },
    },
    {
      '@type': 'Question',
      name: '공시 후 수익률은 어떻게 계산하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '각 종목의 13F 공시일 종가 대비 현재가 변동률을 포트폴리오 비중으로 가중 평균한 값입니다. 공시를 보고 같은 비중으로 따라 샀다면 얻었을 수익률에 해당합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '13F 공시 데이터는 얼마나 자주 업데이트되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '13F 공시는 분기별로 제출됩니다. 각 분기 종료 후 45일 이내에 SEC에 제출되며, 제출 즉시 반영됩니다. 현재가는 매일 갱신됩니다.',
      },
    },
  ],
};

export default async function GuruTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rows = await getGuruSummaries();
  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '13F 구루 포트폴리오',
    itemListElement: rows.map(({ guru, summary }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/portfolio/${guruSlug(guru.name_en)}`,
      name: `${guru.name_kr} (${guru.filing_name})${
        summary?.returnSinceFiling != null ? ` · 공시 후 ${formatRate(summary.returnSinceFiling)}` : ''
      }`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }}
      />
      {children}
    </>
  );
}
