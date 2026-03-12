import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '새 리포트 작성',
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
