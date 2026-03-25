import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export const metadata: Metadata = {
  title: '검색',
  description: '투자 리포트를 검색하세요. 종목명, 티커, 작성자, 제목으로 원하는 투자 분석 리포트를 찾을 수 있습니다.',
  openGraph: {
    title: '투자 리포트 검색',
    description: '투자 리포트를 검색하세요. 종목명, 티커, 작성자, 제목으로 원하는 투자 분석 리포트를 찾을 수 있습니다.',
    url: `${SITE_URL}/search`,
    images: [{ url: '/logo-background.png', width: 512, height: 512, alt: 'AntStreet' }],
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
