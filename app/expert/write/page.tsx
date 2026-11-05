import type { Metadata } from 'next';
import { getBrokerReport } from '@/lib/brokerReports';
import ExpertWriteForm from './ExpertWriteForm';

export const metadata: Metadata = {
  title: '전문가 추적 리포트 등록',
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default async function ExpertWritePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const initial = id ? await getBrokerReport(id) : null;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <ExpertWriteForm initial={initial} />
    </div>
  );
}
