import type { Metadata } from 'next';
import { GURU_LIST } from '@/app/guru-tracker/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

function getGuruBySlug(slug: string) {
  const guruNameEn = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return GURU_LIST.find(g => g.name_en === guruNameEn);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guru = getGuruBySlug(slug);

  if (!guru) {
    return {
      title: '구루를 찾을 수 없습니다',
    };
  }

  const title = `${guru.name_kr}(${guru.name_en}) 포트폴리오 · ${guru.filing_name} 13F 보유 종목`;
  const description = `${guru.name_kr}(${guru.name_en}) ${guru.filing_name}의 SEC 13F 공시 기반 최신 포트폴리오 한국어 추적. 보유 종목, 신규 매수, 전량 매도, 비중 변화를 분기마다 자동 업데이트. 투자 스타일: ${guru.style}. ${guru.catchphrase}`;

  return {
    title,
    description,
    keywords: [
      // 구루 정체성 (한·영·법인명)
      guru.name_kr, guru.name_en, guru.filing_name,
      // 구루 + 의도 키워드 조합 (long-tail 핵심)
      `${guru.name_kr} 포트폴리오`, `${guru.name_kr} 보유 종목`, `${guru.name_kr} 13F`,
      `${guru.name_kr} 최근 매수`, `${guru.name_kr} 매도`, `${guru.name_kr} 비중`,
      `${guru.name_en} portfolio`, `${guru.name_en} 13F`, `${guru.name_en} holdings`,
      `${guru.filing_name} 13F`, `${guru.filing_name} portfolio`,
      // 구루 고유 검색어 (관련 회사·동료·대표종목 — 각 구루별로 types.ts에 정의)
      ...(guru.seo_keywords ?? []),
      // 카테고리·일반
      '13F', 'SEC 13F', '일삼에프', '13F 공시', '13F 한국어',
      '구루 포트폴리오', '투자 대가 포트폴리오', '헤지펀드 포트폴리오',
      guru.style, '가치투자', 'AntStreet', '앤트스트릿',
    ],
    openGraph: {
      type: 'profile',
      title,
      description,
      url: `${SITE_URL}/portfolio/${slug}`,
      images: [{ url: '/og-v2.png', width: 1731, height: 909, alt: `${guru.name_kr} 포트폴리오` }],
    },
    alternates: {
      canonical: `${SITE_URL}/portfolio/${slug}`,
    },
  };
}

function buildJsonLd(slug: string) {
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
  const jsonLd = buildJsonLd(slug);

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
