import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '로그인',
  description: 'AntStreet 로그인 페이지. Google 계정으로 간편하게 로그인하세요.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: null,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
