import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GURU 트래커',
  description: '워렌버핏, 레이 달리오 등 세계적인 투자 구루들의 포트폴리오를 추적하세요. SEC 13F 공시 기반 실시간 포트폴리오 분석.',
  openGraph: {
    title: 'GURU 트래커 | 워렌버핏 따라잡기',
    description: '세계적인 투자 구루들의 포트폴리오를 추적하세요. SEC 13F 공시 기반 실시간 포트폴리오 분석.',
  },
};

export default function GuruTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
