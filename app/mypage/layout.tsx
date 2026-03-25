import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '마이페이지',
  description: '내 투자 리포트, 수익률 통계, 북마크를 관리하세요.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: null,
  },
};

export default function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
