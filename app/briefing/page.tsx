import { Metadata } from 'next';
import BriefingClient from './BriefingClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export const metadata: Metadata = {
  title: '글로벌 모닝 브리핑 - 미국 시장 일일 요약',
  description:
    '매일 아침 미국 주요 매체(WSJ·블룸버그·로이터·CNBC) 기반 시장 브리핑. 주요 지수(S&P500·나스닥·다우), 원자재(원유·금·구리), 달러·환율, 미 국채금리, 그리고 오늘의 핵심 이슈를 한국어로 요약. 출근길에 한 번 읽으면 충분한 글로벌 시장 압축 정리.',
  keywords: [
    '글로벌 모닝 브리핑', '모닝 브리핑', '미국 시장', '미국 증시', '뉴욕 증시',
    '오늘의 미국 시장', '미국 시장 요약', '월스트리트',
    'S&P 500', '나스닥', '다우존스', 'NASDAQ', 'Dow Jones',
    '원자재', 'WTI', '브렌트유', '금 시세', '구리 시세', '달러인덱스', '환율',
    '미 국채금리', '10년물', '2년물',
    'WSJ', '블룸버그', '로이터', 'CNBC',
    'AntStreet', '앤트스트릿',
  ],
  openGraph: {
    title: '글로벌 모닝 브리핑 - 미국 시장 일일 요약 (AntStreet)',
    description:
      '매일 아침 WSJ·블룸버그·CNBC 기반 미국 시장 압축 정리. 지수·원자재·환율·금리·핵심 이슈를 한국어로.',
    url: `${SITE_URL}/briefing`,
    images: [{ url: '/og-v2.png', width: 1731, height: 909, alt: 'AntStreet 모닝 브리핑' }],
  },
  alternates: {
    canonical: `${SITE_URL}/briefing`,
  },
};

const briefingJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/briefing#page`,
      url: `${SITE_URL}/briefing`,
      name: '글로벌 모닝 브리핑',
      description: '미국 주요 매체 기반 미국 시장 일일 요약',
      inLanguage: 'ko-KR',
      isPartOf: { '@id': `${SITE_URL}/#website` },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '브리핑은 언제 업데이트되나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '미국 장 마감 후 주요 매체(WSJ·블룸버그·로이터·CNBC) 헤드라인을 분석하여 매일 아침 한국 시간 기준으로 업데이트됩니다.',
          },
        },
        {
          '@type': 'Question',
          name: '어떤 정보를 한 번에 볼 수 있나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '주요 지수(S&P500·나스닥·다우), 원자재(WTI·브렌트유·금·구리), 달러인덱스·환율, 미 국채금리(10년물·2년물), 그리고 당일 핵심 시장 이슈를 한국어 요약으로 한 화면에서 볼 수 있습니다.',
          },
        },
      ],
    },
  ],
};

const STORAGE_BASE = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o`;

async function fetchJSON(filename: string, tag: string) {
  try {
    const res = await fetch(`${STORAGE_BASE}/${filename}?alt=media`, {
      next: { revalidate: false, tags: [tag, 'briefing-all'] },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function BriefingPage() {
  const [briefingUS, marketUS] = await Promise.all([
    fetchJSON('briefing.json', 'briefing-us'),
    fetchJSON('market.json', 'briefing-us'),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(briefingJsonLd) }}
      />
      <BriefingClient
        data={{
          US: { briefing: briefingUS, market: marketUS },
        }}
      />
    </>
  );
}
