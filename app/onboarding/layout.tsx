import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '프로필 설정',
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
