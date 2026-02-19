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

  return {
    title: `${guru.name_kr} 포트폴리오`,
    description: `${guru.name_kr}(${guru.name_en})의 13F 공시 기반 포트폴리오. ${guru.filing_name} | ${guru.style}. ${guru.catchphrase}`,
    openGraph: {
      title: `${guru.name_kr} 포트폴리오 | AntStreet`,
      description: `${guru.name_kr}(${guru.name_en})의 13F 공시 기반 포트폴리오 분석.`,
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
