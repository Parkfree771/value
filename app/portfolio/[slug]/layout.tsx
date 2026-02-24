import type { Metadata } from 'next';
import { GURU_LIST } from '@/app/guru-tracker/types';

function getGuruBySlug(slug: string) {
  const guruNameEn = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return GURU_LIST.find(g => g.name_en === guruNameEn);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guru = getGuruBySlug(slug);

  if (!guru) {
    return {
      title: '구루를 찾을 수 없습니다',
    };
  }

  const title = `${guru.name_kr}(${guru.name_en}) 포트폴리오 - ${guru.filing_name} SEC 13F 공시`;
  const description = `${guru.name_kr}(${guru.name_en})의 SEC 13F 공시 기반 최신 포트폴리오. ${guru.filing_name} 보유 종목, 신규매수, 전량매도, 비중 변화를 확인하세요. ${guru.style}. ${guru.catchphrase}`;

  return {
    title,
    description,
    keywords: [
      guru.name_kr, guru.name_en, guru.filing_name,
      '13F', 'SEC 13F 공시', '포트폴리오', guru.style,
      '투자 대가', 'guru portfolio', '헤지펀드',
    ],
    openGraph: {
      title: `${title} | AntStreet`,
      description,
    },
    alternates: {
      canonical: `/portfolio/${slug}`,
    },
  };
}

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
