import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '회원가입',
  description: 'AntStreet 회원가입. Google 계정으로 간편하게 가입하고 투자 리포트를 작성하세요.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: null,
  },
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
