import type { Metadata } from 'next';
import { OPINION_LABEL, brokerStats, listBrokerReports } from '@/lib/brokerReports';
import { formatRate, ogCardUrl, SITE_URL } from '@/lib/metadata';
import ExpertAdminLink from './ExpertAdminLink';
import ExpertClient from './ExpertClient';
import Container from '@/components/Container';

export const revalidate = 86400; // 하루짜리 안전장치 — 실제 갱신은 데이터가 바뀔 때 신호로 (lib/cache.ts)

export async function generateMetadata(): Promise<Metadata> {
  const reports = await listBrokerReports();
  const { total, byBroker } = brokerStats(reports);
  const best = [...reports].sort((a, b) => b.returnRate - a.returnRate)[0];
  const title = reports.length
    ? `전문가 추적 · 증권사 리포트대로 샀다면? 평균 ${formatRate(total.avgReturn)} (${reports.length}건)`
    : '전문가 추적 · 증권사 리포트대로 샀다면?';
  const description = [
    '증권사 리포트가 나온 날 샀다면 지금 수익률은? 리포트 작성 당시 가격 대비 현재가로 매일 추적합니다.',
    reports.length
      ? `추적 ${reports.length}건 · 평균 ${formatRate(total.avgReturn)} · 수익 비율 ${Math.round(total.winRate)}%${
          total.targetHitRate !== null ? ` · 목표가 도달 ${Math.round(total.targetHitRate)}%` : ''
        }.`
      : '',
    best ? `최고 ${best.stockName} ${formatRate(best.returnRate)}(${best.broker}).` : '',
    byBroker.length ? `${byBroker.slice(0, 5).map((b) => b.broker).join('·')} 리포트.` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const ogImage = ogCardUrl({
    kicker: '전문가 추적',
    title: '증권사 리포트대로 샀다면?',
    sub: '작성 당시 가격 대비 현재가 · 매일 갱신',
    metrics: reports.length
      ? [
          { label: '평균 수익률', value: formatRate(total.avgReturn) },
          { label: '수익 비율', value: `${Math.round(total.winRate)}%` },
          { label: '추적 리포트', value: `${reports.length}건` },
        ]
      : [],
  });

  return {
    title,
    description,
    keywords: [
      '증권사 리포트', '증권사 리포트 수익률', '증권사 목표가', '목표주가', '애널리스트 리포트',
      '리포트 적중률', '목표가 적중률', '증권사 추천 종목', '증권사 리포트 추적',
      ...[...new Set(reports.map((r) => r.broker))].flatMap((b) => [b, `${b} 리포트`, `${b} 목표가`]),
      'AntStreet', '앤트스트릿',
    ],
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${SITE_URL}/expert`,
      siteName: 'AntStreet',
      locale: 'ko_KR',
      images: [{ url: ogImage, width: 1200, height: 630, alt: '전문가 추적' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    alternates: { canonical: `${SITE_URL}/expert` },
  };
}

export default async function ExpertPage() {
  const reports = await listBrokerReports();

  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '전문가 추적 — 증권사 리포트 수익률',
    itemListElement: reports.slice(0, 30).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/expert/${r.id}`,
      name: `${r.broker} ${r.stockName} ${OPINION_LABEL[r.opinion]} · 발간 후 ${formatRate(r.returnRate)}`,
    })),
  };

  return (
    <Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />
      <h1 className="sr-only">전문가 추적 — 증권사 리포트 수익률</h1>

      <div className="flex justify-end empty:hidden">
        <ExpertAdminLink href="/expert/write" label="리포트 등록" />
      </div>
      <ExpertClient reports={reports} />

      <p className="mt-8 text-center text-[11px] leading-relaxed text-[var(--theme-ink-soft)] break-keep">
        운영자가 주요 리포트를 골라 정리한 것으로, 각 증권사와는 무관합니다. 작성 당시 가격은 리포트 발간일 종가, 현재가는 장 마감 후 매일 갱신되며 투자 권유가 아닙니다.
      </p>
    </Container>
  );
}
