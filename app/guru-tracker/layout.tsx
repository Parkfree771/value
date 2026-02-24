import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '13F 공시 포트폴리오 추적 - 워렌 버핏, 빌 애크먼, 하워드 막스 | 구루 트래커',
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
    title: '13F 공시 포트폴리오 추적 - 워렌 버핏, 빌 애크먼, 하워드 막스 | AntStreet',
    description: 'SEC 13F 공시 기반 투자 대가 포트폴리오 실시간 분석. 워렌 버핏, 빌 애크먼, 하워드 막스, 드러켄밀러, 세스 클라만, 리 루의 신규매수·전량매도·비중 변화를 한눈에.',
  },
  alternates: {
    canonical: '/guru-tracker',
  },
};

export default function GuruTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
