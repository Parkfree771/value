import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '프로필 설정',
  description: 'AntStreet 프로필을 설정하세요. 닉네임과 프로필 사진을 등록할 수 있습니다.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: null,
  },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
