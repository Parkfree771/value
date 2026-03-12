import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개미의 월스트리트 생존기',
  description: '주식 시장에서 살아남는 개미 투자자의 이야기. 하락장의 장애물을 피해 끝까지 달려보세요!',
  robots: { index: false, follow: false },
};

export default function MiniGameLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
