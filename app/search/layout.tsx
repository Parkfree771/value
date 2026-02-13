import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '검색',
  description: '투자 리포트를 검색하세요. 종목명, 티커, 작성자, 제목으로 원하는 투자 분석 리포트를 찾을 수 있습니다.',
  openGraph: {
    title: '검색 | AntStreet',
    description: '투자 리포트를 검색하세요. 종목명, 티커, 작성자, 제목으로 원하는 투자 분석 리포트를 찾을 수 있습니다.',
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
