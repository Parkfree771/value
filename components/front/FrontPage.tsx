'use client';

import { memo, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ReportSummary } from '@/types/report';
import type { Briefing } from '@/lib/briefing';
import UserLevelInline from '@/components/UserLevelInline';
import {
  computeTopReturns,
  PERIOD_KEYS,
  PERIOD_LABELS,
  PERIOD_HINT,
  RankChangeIndicator,
  formatRate,
  returnColorClass,
  type Period,
  type RankedReport,
} from '@/components/front/ranking';
import { GURU_LIST } from '@/app/guru-tracker/types';
import { shortStockName, heldDaysLabel, usableThumbnail, exchangeLabel } from '@/utils/reportDisplay';
import { inferCurrency, formatPrice } from '@/utils/currency';

// 홈 1면 — 주인공은 "수익률 1·2·3위" (AntStreet 만의 지면).
// 신문 문법(흰 바탕 · 괘선 · 명조 제목)만 빌리고, 배치는 순위 중심: 1·2·3위 가로 3칸 + 4~10위 순위표 / 오른쪽 브리핑·구루.

const OPINION_LABEL: Record<string, string> = { buy: '매수', sell: '매도', hold: '보유' };
const DATE_KR = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric' });

function Kicker({ report }: { report: ReportSummary }) {
  const ex = exchangeLabel(report.exchange);
  return (
    <p className="kicker">
      {shortStockName(report.stockName, report.ticker)}
      {ex && <span className="text-[var(--theme-ink-soft)]"> · {ex}</span>} · {OPINION_LABEL[report.opinion] ?? ''}
    </p>
  );
}

function Byline({ report }: { report: ReportSummary }) {
  return (
    <p suppressHydrationWarning className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-[var(--theme-ink-soft)]">
      <span className="font-semibold text-[var(--foreground)]">{report.author}</span>
      <UserLevelInline points={report.levelPoints} />
      <span>· {report.createdAt} 작성</span>
    </p>
  );
}

function PriceLine({ report }: { report: ReportSummary }) {
  if (!(report.initialPrice > 0 && report.currentPrice > 0)) return null;
  const currency = inferCurrency({ exchange: report.exchange, category: report.category, ticker: report.ticker });
  return (
    <p suppressHydrationWarning className="text-xs text-[var(--theme-ink-soft)] tabular-nums">
      {heldDaysLabel(report.createdAt)} · {formatPrice(report.initialPrice, currency)} → {formatPrice(report.currentPrice, currency)}
    </p>
  );
}

/** 1·2·3위 — 같은 크기로 가로 3칸 (1위만 순위 숫자 오렌지) */
function PodiumCard({ item, period }: { item: RankedReport; period: Period }) {
  const thumb = usableThumbnail(item.thumbnail);
  return (
    <article className="group flex flex-col h-full">
      <div className="flex items-end justify-between gap-3 border-b border-[var(--theme-border-muted)] pb-2">
        <span className={`font-serif font-black leading-none text-[40px] ${item.rank === 1 ? 'text-[var(--theme-orange)]' : 'text-[var(--foreground)]'}`}>
          {item.rank}
        </span>
        <div className="text-right min-w-0">
          <p className={`font-mono font-black tracking-tight leading-none text-[26px] ${returnColorClass(item.displayRate)}`}>
            {formatRate(item.displayRate)}
          </p>
          <div className="mt-1">
            {period === 'all' ? (
              <PriceLine report={item} />
            ) : (
              <p className="text-xs text-[var(--theme-ink-soft)]">누적 {formatRate(item.returnRate)}</p>
            )}
          </div>
        </div>
      </div>
      {/* 이미지 — 없으면 같은 크기 칸에 매수 이유 (세 칸 높이를 2:1 로 통일) */}
      <Link href={`/reports/${item.id}`} className="block relative mt-3 aspect-[2/1] overflow-hidden bg-[var(--theme-bg)]">
        {thumb ? (
          <Image src={thumb} alt="" fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover" />
        ) : (
          <span className="absolute inset-0 px-3 py-2.5">
            {/* 정확히 4줄에서 말줄임 — 클래스 대신 인라인 스타일로 고정 (높이도 4줄로 제한) */}
            <span
              className="text-[12.5px] text-[var(--theme-ink-soft)]"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.55,
                maxHeight: 'calc(1.55em * 4)',
              }}
            >
              “{item.excerpt || item.title}”
            </span>
          </span>
        )}
      </Link>
      <div className="mt-3 flex-1 flex flex-col">
        <Kicker report={item} />
        {/* 제목은 항상 두 줄 높이 — 세 칸의 작성자 줄이 나란히 */}
        <h3 className="headline mt-1 text-[18px] leading-snug line-clamp-2 min-h-[2.75em] break-keep">
          <Link href={`/reports/${item.id}`} className="group-hover:underline underline-offset-4">{item.title}</Link>
        </h3>
        <div className="mt-auto">
          <Byline report={item} />
        </div>
      </div>
    </article>
  );
}

/** 4위부터 순위표 (한 줄씩 위→아래) */
function Leaderboard({ items }: { items: RankedReport[] }) {
  if (items.length === 0) return null;
  return (
    <ol className="mt-5 border-t-2 border-[var(--theme-border)]">
      {items.map((r) => (
        <li key={r.id} className="border-b border-[var(--theme-border-muted)]">
          <Link href={`/reports/${r.id}`} className="group grid grid-cols-[1.75rem_1fr_auto] items-baseline gap-x-3 py-2">
            <span className="font-serif text-lg font-black text-[var(--theme-ink-soft)]">{r.rank}</span>
            <span className="min-w-0">
              <span className="headline text-[15px] leading-snug group-hover:underline underline-offset-4 line-clamp-1">{r.title}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-[var(--theme-ink-soft)]">
                <span className="font-bold text-[var(--theme-orange)]">{shortStockName(r.stockName, r.ticker)}</span>
                {exchangeLabel(r.exchange) && <span>{exchangeLabel(r.exchange)}</span>}
                <span>· {r.author}</span>
                <UserLevelInline points={r.levelPoints} />
              </span>
            </span>
            <span className="flex items-baseline gap-1.5">
              <RankChangeIndicator change={r.rankChange} />
              <span className={`font-mono font-black tabular-nums ${returnColorClass(r.displayRate)}`}>{formatRate(r.displayRate)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

// 순위표 기본 노출 / 펼쳤을 때 최대
const RANK_INITIAL = 15;
const RANK_MAX = 30;

/** 1면 주인공 — 수익률 1·2·3위 + 4~15위 (더보기 30위) */
function RankingFront({ reports }: { reports: ReportSummary[] }) {
  const [period, setPeriod] = useState<Period>('all');
  const [expanded, setExpanded] = useState(false);
  const top = useMemo(() => computeTopReturns(reports, period, RANK_MAX), [reports, period]);
  const podium = top.slice(0, 3);
  const board = top.slice(3, expanded ? RANK_MAX : RANK_INITIAL);
  const canExpand = !expanded && top.length > RANK_INITIAL;

  return (
    <section aria-label="수익률 순위">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 mb-3">
        <div>
          <p className="kicker">시장이 채점한 리포트</p>
          <h2 className="headline text-[26px] sm:text-[30px] leading-tight">수익률 1·2·3위</h2>
          <p className="text-xs text-[var(--theme-ink-soft)]">{PERIOD_HINT[period]}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {PERIOD_KEYS.map((p) => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setExpanded(false); }}
              aria-pressed={period === p}
              className={period === p ? 'font-bold text-[var(--foreground)] border-b-2 border-[var(--theme-border)] pb-0.5' : 'text-[var(--theme-ink-soft)] hover:text-[var(--foreground)] pb-0.5 border-b-2 border-transparent'}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
          <Link href="/ranking" className="ml-1 text-xs font-bold hover:underline">전체 랭킹 →</Link>
        </div>
      </div>

      {podium.length > 0 ? (
        <>
          {/* 데스크탑: 가로 3칸 / 모바일: 옆으로 밀어서 1→2→3 */}
          <div className="-mx-4 px-4 flex gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:gap-0 md:overflow-visible">
            {podium.map((r, i) => (
              <div
                key={r.id}
                className={`flex-shrink-0 w-[80vw] max-w-[320px] snap-start md:w-auto md:max-w-none md:px-5 ${i === 0 ? 'md:pl-0' : ''} ${i === podium.length - 1 ? 'md:pr-0' : 'md:border-r md:border-[var(--theme-border-muted)]'}`}
              >
                <PodiumCard item={r} period={period} />
              </div>
            ))}
          </div>
          <Leaderboard items={board} />
          {/* 15위까지 기본 → 더보기로 30위까지 펼침 → 그 뒤는 랭킹 페이지 */}
          <div className="flex items-center justify-between gap-3 border-b border-[var(--theme-border-muted)] py-2.5 text-sm">
            {canExpand ? (
              <button onClick={() => setExpanded(true)} className="font-bold hover:underline underline-offset-4">
                {RANK_INITIAL + 1}~{Math.min(top.length, RANK_MAX)}위 더보기 ▾
              </button>
            ) : expanded ? (
              <button onClick={() => setExpanded(false)} className="font-bold hover:underline underline-offset-4">
                접기 ▴
              </button>
            ) : (
              <span />
            )}
            <Link href="/ranking" className="font-bold hover:underline underline-offset-4">
              전체 랭킹 보기 →
            </Link>
          </div>
        </>
      ) : (
        <p className="py-8 text-center text-sm text-[var(--theme-ink-soft)]">해당 기간 수익률 데이터가 충분하지 않습니다.</p>
      )}
    </section>
  );
}

/** 오른쪽 — 모닝 브리핑 (해외 매체 RSS 를 모아 다시 쓴 헤드라인) */
function BriefingColumn({ briefing }: { briefing: Briefing | null }) {
  return (
    <section aria-label="모닝 브리핑">
      <p className="kicker">매일 아침 6시</p>
      <h2 className="headline text-[22px] border-b-2 border-[var(--theme-border)] pb-1.5">모닝 브리핑</h2>
      {briefing ? (
        <>
          <p suppressHydrationWarning className="mt-2 text-xs text-[var(--theme-ink-soft)]">
            {DATE_KR.format(new Date(briefing.generatedAt))} 자 · 해외 기사 {briefing.sourceArticles.toLocaleString('ko-KR')}건 종합
            {briefing.isStale && ' · 지난 호'}
          </p>
          <ol className="mt-1">
            {briefing.issues.slice(0, 6).map((issue, i) => (
              <li key={i} className="flex gap-3 py-3 border-b border-[var(--theme-border-muted)] last:border-b-0">
                <span className="flex-shrink-0 w-5 font-serif font-black text-[var(--theme-orange)]">{i + 1}</span>
                <div className="min-w-0">
                  <h3 className="headline text-[15px] leading-snug break-keep">{issue.headline}</h3>
                  {i === 0 && <p className="mt-1 text-[13px] leading-relaxed text-[var(--theme-ink-soft)] line-clamp-3">{issue.summary}</p>}
                  {issue.tags && issue.tags.length > 0 && (
                    <p className="mt-1 text-[11px] text-[var(--theme-ink-soft)]">#{issue.tags.join(' #')}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <Link href="/briefing" className="mt-2 inline-block text-xs font-bold hover:underline">
            {briefing.issues.length}개 전체 보기 →
          </Link>
        </>
      ) : (
        <p className="mt-2 text-sm text-[var(--theme-ink-soft)]">
          밤사이 해외 주요 매체 기사를 모아 아침 6시에 헤드라인 10개로 정리해 드립니다. (준비 중)
        </p>
      )}
    </section>
  );
}

/** 오른쪽 — 구루 포트폴리오 바로가기 */
function GuruColumn() {
  return (
    <section aria-label="구루 포트폴리오">
      <p className="kicker">SEC 13F</p>
      <h2 className="headline text-[20px] border-b-2 border-[var(--theme-border)] pb-1.5">구루 포트폴리오</h2>
      <ul>
        {GURU_LIST.slice(0, 5).map((g) => (
          <li key={g.cik} className="border-b border-[var(--theme-border-muted)] last:border-b-0">
            <Link href={`/portfolio/${g.name_en.toLowerCase().replace(/\s+/g, '-')}`} className="group flex items-baseline justify-between gap-3 py-2.5">
              <span className="headline text-[15px] group-hover:underline underline-offset-4">{g.name_kr}</span>
              <span className="text-xs text-[var(--theme-ink-soft)]">{g.style}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/guru-tracker" className="mt-2 inline-block text-xs font-bold hover:underline">전체 구루 보기 →</Link>
    </section>
  );
}

/** 최신 리포트 — 3단 기사 묶음 */
function LatestGrid({ reports }: { reports: ReportSummary[] }) {
  return (
    <section aria-label="최신 리포트">
      <div className="section-rule mb-1">
        <h2 className="text-xl sm:text-2xl text-heading">최신 리포트</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r, i) => {
          const thumb = usableThumbnail(r.thumbnail);
          return (
            <article
              key={r.id}
              className={`group py-4 border-b border-[var(--theme-border-muted)] sm:px-4 ${i % 3 === 0 ? 'lg:pl-0' : ''} ${i % 3 === 2 ? 'lg:pr-0' : 'lg:border-r'}`}
            >
              {thumb && (
                <Link href={`/reports/${r.id}`} className="block relative aspect-[2/1] overflow-hidden bg-[var(--theme-bg)] mb-2.5">
                  <Image src={thumb} alt="" fill sizes="(max-width: 1024px) 50vw, 400px" className="object-cover" />
                </Link>
              )}
              <div className="flex items-baseline justify-between gap-2">
                <Kicker report={r} />
                <span className={`font-mono text-sm font-black tabular-nums ${returnColorClass(r.returnRate)}`}>{formatRate(r.returnRate)}</span>
              </div>
              <h3 className="headline mt-1 text-[18px] leading-snug break-keep">
                <Link href={`/reports/${r.id}`} className="group-hover:underline underline-offset-4">{r.title}</Link>
              </h3>
              {!thumb && r.excerpt && (
                <p className="mt-1 text-sm leading-relaxed text-[var(--theme-ink-soft)] line-clamp-3">{r.excerpt}</p>
              )}
              <Byline report={r} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

interface FrontPageProps {
  reports: ReportSummary[];
  briefing: Briefing | null;
}

const FrontPage = memo(function FrontPage({ reports, briefing }: FrontPageProps) {
  const latest = useMemo(
    () => [...reports].sort((a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0)).slice(0, 6),
    [reports],
  );

  if (reports.length === 0) return null;

  return (
    <>
      <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-0">
        <div className="min-w-0 lg:col-span-8 lg:pr-8">
          <RankingFront reports={reports} />
        </div>
        <aside className="min-w-0 lg:col-span-4 lg:pl-8 lg:border-l lg:border-[var(--theme-border-muted)] space-y-10">
          <BriefingColumn briefing={briefing} />
          <GuruColumn />
        </aside>
      </div>

      <div className="mt-12">
        <LatestGrid reports={latest} />
      </div>
    </>
  );
});

export default FrontPage;
