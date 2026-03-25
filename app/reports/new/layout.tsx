import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '새 리포트 작성',
  description: '새로운 투자 리포트를 작성하세요. 종목 분석과 매수·매도 의견을 공유합니다.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: null,
  },
};

export default function NewReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
