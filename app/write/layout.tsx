import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '리포트 작성',
  description: '투자 리포트를 작성하세요. 종목 분석, 매수·매도 의견을 공유하고 실시간 수익률을 추적합니다.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: null,
  },
};

export default function WriteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
