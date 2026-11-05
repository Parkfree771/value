import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Card from '@/components/Card';
import { OpinionBadge } from '@/components/Badge';
import PriceChart from '@/components/LazyPriceChart';
import ShareButtons from '@/components/ShareButtons';
import {
  OPINION_LABEL,
  daysSinceReport,
  getBrokerReport,
  listBrokerReports,
  targetReached,
  targetUpside,
} from '@/lib/brokerReports';
import { formatRate, ogCardUrl, SITE_URL } from '@/lib/metadata';
import { formatReturn, getReturnColorClass } from '@/utils/calculateReturn';
import { formatPrice } from '@/utils/currency';
import { exchangeLabel } from '@/utils/reportDisplay';
import ExpertAdminLink from '../ExpertAdminLink';
import ExpertReportCard from '../ExpertReportCard';

export const revalidate = 86400; // 하루짜리 안전장치 — 실제 갱신은 데이터가 바뀔 때 신호로 (lib/cache.ts)

// 미리 만들어 두지 않고 처음 방문 때 만든 뒤 캐시 (ISR) — 빈 목록이어야 동적 URL 도 캐시된다.
// 갱신은 데이터가 바뀔 때 신호로 (lib/cache.ts)
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const r = await getBrokerReport(id);
  if (!r) return { title: '리포트를 찾을 수 없습니다', robots: { index: false, follow: true } };

  const op = r.opinionRaw || OPINION_LABEL[r.opinion];
  const days = daysSinceReport(r);
  const hasResult = days > 0 || Math.abs(r.returnRate) >= 0.05;
  // [+12.3%] 미래에셋증권 롯데쇼핑 매수 · 목표가 119,000원
  const head = `${r.broker} ${r.stockName} ${op}${r.targetPrice ? ` · 목표가 ${formatPrice(r.targetPrice, r.currency)}` : ''}`;
  const title = hasResult ? `[${formatRate(r.returnRate)}] ${head}` : head;
  const description = [
    hasResult ? `발간 후 수익률 ${formatRate(r.returnRate)} (${days}일).` : '오늘 발간 — 작성 당시 가격 대비 수익률을 매일 추적합니다.',
    `작성 당시 ${formatPrice(r.basePrice, r.currency)} → 현재가 ${formatPrice(r.currentPrice, r.currency)}.`,
    `${r.broker} ${r.reportDate.replaceAll('-', '.')} ${r.stockName}(${r.ticker}) ${op} 리포트 —`,
    r.headline,
  ]
    .join(' ')
    .slice(0, 200);
  const ogImage = ogCardUrl({
    kicker: `${r.broker} · ${r.reportDate.replaceAll('-', '.')}`,
    title: r.stockName,
    sub: `${op}${r.targetPrice ? ` · 목표가 ${formatPrice(r.targetPrice, r.currency)}` : ''} · ${r.headline}`.slice(0, 60),
    metrics: [
      { label: '발간 후 수익률', value: formatRate(r.returnRate) },
      { label: '작성 당시', value: formatPrice(r.basePrice, r.currency) },
      { label: '현재가', value: formatPrice(r.currentPrice, r.currency) },
    ],
  });
  const url = `${SITE_URL}/expert/${r.id}`;

  return {
    title,
    description,
    keywords: [
      r.stockName, r.ticker, `${r.stockName} 목표가`, `${r.stockName} 목표주가`, `${r.stockName} 증권사 리포트`,
      `${r.broker} ${r.stockName}`, `${r.broker} 리포트`, `${r.stockName} 전망`, '증권사 리포트 수익률', 'AntStreet',
    ],
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: 'AntStreet',
      locale: 'ko_KR',
      publishedTime: new Date(`${r.reportDate}T00:00:00+09:00`).toISOString(),
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    alternates: { canonical: url },
  };
}

// 숫자 칸 — 회원 리포트 상세의 작성가·현재가·목표가 줄과 같은 모양
function Cell({ label, value, tone, last }: { label: string; value: string; tone?: number; last?: boolean }) {
  return (
    <div className={`flex-1 min-w-0 px-3 py-2.5 sm:px-4 sm:py-3 ${last ? '' : 'border-r border-[var(--theme-border-muted)]'}`}>
      <div className="text-[11px] sm:text-xs text-[var(--theme-ink-soft)]">{label}</div>
      <div
        className={`text-xs sm:text-base font-bold font-mono tabular-nums mt-0.5 break-keep ${
          tone !== undefined ? getReturnColorClass(tone) : 'text-[var(--foreground)]'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export default async function ExpertReportPage({ params }: Params) {
  const { id } = await params;
  const r = await getBrokerReport(id);
  if (!r) notFound();

  const op = r.opinionRaw || OPINION_LABEL[r.opinion];
  const upside = targetUpside(r);
  const reached = targetReached(r);
  const points = r.summary
    .split('\n')
    .map((s) => s.replace(/^[-•·*\s]+/, '').trim())
    .filter(Boolean);
  const targetChange =
    r.targetPrice && r.prevTargetPrice ? ((r.targetPrice - r.prevTargetPrice) / r.prevTargetPrice) * 100 : null;
  const sameStock = (await listBrokerReports()).filter((x) => x.ticker === r.ticker && x.id !== r.id).slice(0, 5);
  const url = `${SITE_URL}/expert/${r.id}`;
  const isPdf = !!r.sourceUrl && /\.pdf(\?|$)/i.test(r.sourceUrl);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${r.broker} ${r.stockName} ${op} — ${r.headline}`.slice(0, 110),
    description: `발간 후 수익률 ${formatRate(r.returnRate)}. ${r.headline}`,
    datePublished: new Date(`${r.reportDate}T00:00:00+09:00`).toISOString(),
    inLanguage: 'ko-KR',
    author: { '@type': 'Organization', name: 'AntStreet 전문가 추적', url: `${SITE_URL}/expert` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    mainEntityOfPage: url,
    about: { '@type': 'Corporation', name: r.stockName, tickerSymbol: r.ticker },
    ...(r.sourceUrl
      ? {
          isBasedOn: {
            '@type': 'Report',
            name: r.reportTitle || r.headline,
            url: r.sourceUrl,
            publisher: { '@type': 'Organization', name: r.broker },
          },
        }
      : {}),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 제목 + 메타 정보 */}
      <div className="mb-4 sm:mb-6">
        <h1 className="headline text-lg sm:text-2xl font-bold mb-2 sm:mb-3 leading-tight break-keep break-words sm:break-normal">
          {r.headline}
        </h1>
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-[var(--theme-ink-soft)] flex-wrap">
          <span className="font-medium text-[var(--foreground)]">
            {r.broker}
          </span>
          <span>{r.reportDate}</span>
          <ExpertAdminLink href={`/expert/write?id=${r.id}`} label="수정" />
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* 종목 카드 */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between p-3 sm:px-4 sm:py-3">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
              <span className="text-sm sm:text-xl font-bold text-[var(--foreground)]">{r.stockName}</span>
              {r.stockName.toUpperCase() !== r.ticker.toUpperCase() && (
                <span className="font-mono text-[11px] sm:text-xs text-[var(--theme-ink-soft)]">{r.ticker}</span>
              )}
              {exchangeLabel(r.exchange) && (
                <span className="text-[11px] sm:text-xs text-[var(--theme-ink-soft)]">{exchangeLabel(r.exchange)}</span>
              )}
              <OpinionBadge opinion={r.opinion} />
            </div>
            <span className={`flex-shrink-0 ml-2 sm:ml-4 text-lg sm:text-2xl font-black font-mono tabular-nums ${getReturnColorClass(r.returnRate)}`}>
              {formatReturn(r.returnRate)}
            </span>
          </div>
          <div className="flex border-t border-[var(--theme-border-muted)]">
            <Cell label="작성 당시" value={formatPrice(r.basePrice, r.currency)} />
            <Cell label="현재가" value={formatPrice(r.currentPrice, r.currency)} tone={r.returnRate} />
            <Cell label="목표가" value={r.targetPrice ? formatPrice(r.targetPrice, r.currency) : '-'} last />
          </div>
          <div className="flex border-t border-[var(--theme-border-muted)] bg-[var(--theme-bg)]">
            <Cell label="투자의견" value={op} />
            <Cell
              label="직전 목표가"
              value={r.prevTargetPrice && targetChange !== null ? `${formatPrice(r.prevTargetPrice, r.currency)} (${formatRate(targetChange)})` : '-'}
            />
            <Cell
              label={reached ? '목표가' : '목표까지'}
              value={reached ? '도달' : upside !== null ? formatRate(upside) : '-'}
              tone={reached ? 1 : undefined}
              last
            />
          </div>
        </Card>

        <PriceChart
          ticker={r.ticker}
          initialPrice={r.basePrice}
          currentPrice={r.currentPrice}
          createdAt={r.reportDate}
          returnRate={r.returnRate}
          currency={r.currency}
          baseLabel="작성 당시"
        />

        {/* 본문 — 핵심 정리 + 출처 */}
        <div className="border-t border-[var(--theme-border-muted)] pt-4 sm:pt-6">
          <div className="article-content max-w-none">
            <ul>
              {points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
            <p>
              원문: {r.broker}
              {r.reportTitle && ` 「${r.reportTitle}」`} ({r.reportDate})
              {r.sourceUrl && (
                <>
                  {' '}
                  <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                    {isPdf ? '원문 리포트 보기 (PDF)' : '출처 보기'}
                  </a>
                </>
              )}
            </p>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[var(--theme-ink-soft)] break-keep">
            운영자가 주요 리포트를 골라 원문을 읽고 정리한 것으로, 각 증권사와는 무관합니다. 수익률은 작성 당시 가격(발간일 종가) 대비 현재가이며 투자 권유가 아닙니다.
          </p>
        </div>

        <section className="border-t-2 border-[var(--theme-border)] pt-3">
          <h3 className="headline text-[16px] sm:text-[17px] mb-2 sm:mb-3">이 리포트가 도움이 됐다면 공유해주세요</h3>
          <ShareButtons url={url} title={`${r.broker} ${r.stockName} — ${r.headline}`} hashTags={[r.stockName, r.broker, 'AntStreet']} />
        </section>

        {sameStock.length > 0 && (
          <section className="border-t-2 border-[var(--theme-border)] pt-3">
            <h3 className="headline text-[16px] sm:text-[17px]">{r.stockName} 다른 리포트</h3>
            {sameStock.map((x) => (
              <ExpertReportCard key={x.id} r={x} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
