import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export const metadata: Metadata = {
  title: '글로벌 종목 · 투자 리포트 검색',
  description:
    '한·미·일·중·홍콩 종목명, 티커, 작성자로 투자 리포트를 검색하세요. 종목별 매수/매도 의견 컨센서스, 작성가 vs 현재가 수익률, 13F 구루의 보유 여부를 한번에 확인할 수 있습니다.',
  keywords: [
    '주식 검색', '종목 검색', '투자 리포트 검색', '리포트 검색',
    '종목 컨센서스', '투자 의견 컨센서스',
    '한국 주식 검색', '미국 주식 검색', '일본 주식 검색', '중국 주식 검색', '홍콩 주식 검색',
    '코스피 종목', '코스닥 종목', '나스닥 종목', 'NYSE 종목',
    '삼성전자', 'SK하이닉스', 'TSMC', 'NVDA', 'AAPL', 'TSLA',
    '티커 검색', 'ticker', '종목코드',
    'AntStreet', '앤트스트릿',
  ],
  openGraph: {
    title: '글로벌 종목·리포트 검색 - AntStreet',
    description:
      '종목명·티커·작성자로 투자 리포트 검색. 한·미·일·중·홍콩 종목 컨센서스와 13F 구루 보유 여부 확인.',
    url: `${SITE_URL}/search`,
    images: [{ url: '/og-v2.png', width: 1731, height: 909, alt: 'AntStreet' }],
  },
  alternates: {
    canonical: `${SITE_URL}/search`,
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
