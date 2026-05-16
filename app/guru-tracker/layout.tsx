import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export const metadata: Metadata = {
  title: '13F 공시 포트폴리오 한국어 추적 · 워렌 버핏 · 빌 애크먼 · 리 루 · 하워드 막스',
  description: 'SEC 13F 공시(일삼에프) 기반 투자 대가 9명의 분기별 포트폴리오를 한국어로 추적. 워렌 버핏(버크셔 해서웨이), 빌 애크먼(퍼싱 스퀘어), 리 루(히말라야 캐피털, 멍거의 파트너), 하워드 막스(오크트리), 세스 클라만(바우포스트), 드러켄밀러(듀케인), 칼 아이칸, 데이비드 테퍼, 토마스 게이너의 신규매수·전량매도·비중 변화를 한눈에.',
  keywords: [
    // 13F 카테고리
    '13F', '13F 공시', '일삼에프', 'SEC 13F', '13F filing', '13F 포트폴리오',
    '13F 한국어', '13F tracker', '포트폴리오 추적',
    // 구루 한·영 풀세트
    '워렌 버핏', 'Warren Buffett', '버크셔 해서웨이', 'Berkshire Hathaway',
    '찰리 멍거', 'Charlie Munger',
    '빌 애크먼', 'Bill Ackman', '퍼싱 스퀘어', 'Pershing Square',
    '하워드 막스', 'Howard Marks', '오크트리', 'Oaktree',
    '스탠리 드러켄밀러', 'Stanley Druckenmiller', '듀케인',
    '세스 클라만', 'Seth Klarman', '바우포스트', 'Baupost',
    '리 루', 'Li Lu', '히말라야 캐피털', 'Himalaya Capital',
    '칼 아이칸', 'Carl Icahn', 'Icahn Enterprises',
    '데이비드 테퍼', 'David Tepper', '아팔루사', 'Appaloosa',
    '토마스 게이너', 'Thomas Gayner', '마켈', 'Markel',
    // 일반
    '구루 포트폴리오', '투자 대가 포트폴리오', '헤지펀드 포트폴리오',
    'guru portfolio', 'hedge fund 13F', '가치투자',
  ],
  openGraph: {
    title: '13F 공시 포트폴리오 한국어 추적 · 9명의 투자 대가',
    description: '워렌 버핏(버크셔), 빌 애크먼(퍼싱 스퀘어), 리 루(멍거의 파트너), 하워드 막스, 세스 클라만, 드러켄밀러, 칼 아이칸, 데이비드 테퍼, 토마스 게이너의 분기별 SEC 13F 포트폴리오를 한국어로.',
    url: `${SITE_URL}/guru-tracker`,
    images: [{ url: '/og-v2.jpg', width: 1200, height: 630, alt: 'AntStreet' }],
  },
  alternates: {
    canonical: `${SITE_URL}/guru-tracker`,
  },
};

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
        text: '워렌 버핏(Berkshire Hathaway), 빌 애크먼(Pershing Square), 하워드 막스(Oaktree Capital), 스탠리 드러켄밀러(Duquesne Family Office), 세스 클라만(Baupost Group), 리 루(Himalaya Capital)의 포트폴리오를 추적합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '13F 공시 데이터는 얼마나 자주 업데이트되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '13F 공시는 분기별로 제출됩니다. 각 분기 종료 후 45일 이내에 SEC에 제출되며, 제출 즉시 반영됩니다.',
      },
    },
  ],
};

export default function GuruTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
