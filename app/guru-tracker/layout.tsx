import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '13F 공시 포트폴리오 추적 - 워렌 버핏, 빌 애크먼, 하워드 막스',
  description: 'SEC 13F 공시(일삼에프) 기반 투자 대가 포트폴리오 실시간 추적. 워렌 버핏(Warren Buffett), 빌 애크먼(Bill Ackman), 하워드 막스(Howard Marks), 스탠리 드러켄밀러(Stanley Druckenmiller), 세스 클라만(Seth Klarman), 리 루(Li Lu)의 13F 보유 종목, 신규매수, 전량매도, 비중 변화를 한눈에 확인하세요.',
  keywords: [
    '13F', '13F 공시', '일삼에프', 'SEC 13F', '13F filing', '13F 포트폴리오',
    '워렌 버핏', 'Warren Buffett', '버핏 포트폴리오', '빌 애크먼', 'Bill Ackman',
    '하워드 막스', 'Howard Marks', '스탠리 드러켄밀러', 'Stanley Druckenmiller',
    '세스 클라만', 'Seth Klarman', '리 루', 'Li Lu',
    '구루 포트폴리오', 'guru portfolio', '투자 대가', '헤지펀드 포트폴리오',
    'hedge fund 13F', '포트폴리오 추적', '13F tracker',
  ],
  openGraph: {
    title: '13F 공시 포트폴리오 추적 - 워렌 버핏, 빌 애크먼, 하워드 막스',
    description: 'SEC 13F 공시 기반 투자 대가 포트폴리오 실시간 분석. 워렌 버핏, 빌 애크먼, 하워드 막스, 드러켄밀러, 세스 클라만, 리 루의 신규매수·전량매도·비중 변화를 한눈에.',
  },
  alternates: {
    canonical: '/guru-tracker',
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
