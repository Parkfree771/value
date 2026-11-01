'use client';

import { memo, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ReportSummary } from '@/types/report';
import type { Briefing } from '@/lib/briefing';
import UserLevelInline from '@/components/UserLevelInline';
import {
  computeTopReturns,
  PERIOD_KEYS,
  PERIOD_LABELS,
  RankChangeIndicator,
  formatRate,
  returnColorClass,
  type Period,
  type RankedReport,
} from '@/components/front/ranking';
import { GURU_LIST } from '@/app/guru-tracker/types';
import { stockLabel, heldDaysLabel, exchangeLabel } from '@/utils/reportDisplay';
import { inferCurrency, formatPrice } from '@/utils/currency';

// 홈 1면 — 주인공은 "수익률 1·2·3위" (AntStreet 만의 지면).
// 신문 문법(흰 바탕 · 괘선 · 명조 제목)만 빌리고, 배치는 순위 중심: 1·2·3위 가로 3칸 + 4~10위 순위표 / 오른쪽 브리핑·구루.
// 전체 글은 바로 아래 "모든 리포트" 가 보여 주므로 1면은 순위와 요약만 둔다.

const OPINION_LABEL: Record<string, string> = { buy: '매수', sell: '매도', hold: '보유' };
const DATE_KR = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric' });

function Kicker({ report }: { report: ReportSummary }) {
  const ex = exchangeLabel(report.exchange);
  return (
    <p className="kicker truncate">
      {stockLabel(report.stockName, report.ticker)}
      {ex && <span className="text-[var(--theme-ink-soft)]"> · {ex}</span>} · {OPINION_LABEL[report.opinion] ?? ''}
    </p>
  );
}

/** 1·2·3위 — 같은 크기로 가로 3칸 (1위만 순위 숫자 오렌지) */
function PodiumCard({ item }: { item: RankedReport }) {
  return (
    <article className="group flex flex-col h-full">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`font-serif font-black leading-none text-[34px] ${item.rank === 1 ? 'text-[var(--theme-orange)]' : 'text-[var(--foreground)]'}`}>
          {item.rank}
        </span>
        <span className={`font-mono font-black tracking-tight leading-none text-[26px] ${returnColorClass(item.displayRate)}`}>
          {formatRate(item.displayRate)}
        </span>
      </div>
      {/* 제목은 항상 두 줄 높이 — 세 칸의 아랫줄이 나란히 */}
      <h3 className="headline mt-3 text-[18px] leading-snug line-clamp-2 min-h-[2.75em] break-keep">
        <Link href={`/reports/${item.id}`} className="group-hover:underline underline-offset-4">{item.title}</Link>
      </h3>
      <div className="mt-2">
        <Kicker report={item} />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-[var(--theme-ink-soft)]">
        <span suppressHydrationWarning className="tabular-nums">{item.createdAt}</span>
        <span className="flex items-center gap-x-1.5 min-w-0">
          <span className="truncate font-semibold text-[var(--foreground)]">{item.author}</span>
          <UserLevelInline points={item.levelPoints} />
        </span>
      </div>
    </article>
  );
}

/** 순위표 오른쪽 아랫줄 — 전체 탭은 보유 기간 · 작성가 → 현재가, 기간 탭은 누적 수익률 */
function RateDetail({ report, period }: { report: RankedReport; period: Period }) {
  if (period !== 'all') return <>누적 {formatRate(report.returnRate)}</>;
  if (!(report.initialPrice > 0 && report.currentPrice > 0)) return null;
  const currency = inferCurrency({ exchange: report.exchange, category: report.category, ticker: report.ticker });
  return (
    <>
      {heldDaysLabel(report.createdAt)}
      <span className="hidden sm:inline"> · {formatPrice(report.initialPrice, currency)} → {formatPrice(report.currentPrice, currency)}</span>
    </>
  );
}

/** 4위부터 순위표 — 왼쪽 제목 · 종목 · 작성자, 오른쪽 수익률 · 보유 기간 · 가격 */
function Leaderboard({ items, period }: { items: RankedReport[]; period: Period }) {
  if (items.length === 0) return null;
  return (
    <ol className="mt-6 border-t-2 border-[var(--theme-border)]">
      {items.map((r) => {
        const ex = exchangeLabel(r.exchange);
        return (
          <li key={r.id} className="border-b border-[var(--theme-border-muted)]">
            <Link href={`/reports/${r.id}`} className="group grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5">
              <span className="font-serif text-lg font-black text-[var(--theme-ink-soft)]">{r.rank}</span>
              <span className="min-w-0">
                <span className="block truncate headline text-[15px] leading-snug group-hover:underline underline-offset-4">{r.title}</span>
                <span className="mt-0.5 flex items-center gap-x-1.5 text-xs text-[var(--theme-ink-soft)] whitespace-nowrap overflow-hidden">
                  <span className="truncate font-bold text-[var(--foreground)]">{stockLabel(r.stockName, r.ticker)}</span>
                  {ex && <span>{ex}</span>}
                  <span className="hidden sm:inline">· {r.author}</span>
                  <span className="hidden sm:inline-flex"><UserLevelInline points={r.levelPoints} /></span>
                </span>
              </span>
              <span className="text-right">
                <span className="flex items-baseline justify-end gap-1.5">
                  <RankChangeIndicator change={r.rankChange} />
                  <span className={`font-mono font-black tabular-nums ${returnColorClass(r.displayRate)}`}>{formatRate(r.displayRate)}</span>
                </span>
                <span suppressHydrationWarning className="mt-0.5 block text-xs tabular-nums whitespace-nowrap text-[var(--theme-ink-soft)]">
                  <RateDetail report={r} period={period} />
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

// 1면 순위 — 1·2·3위 + 4~10위. 그 뒤는 랭킹 페이지
const RANK_LIMIT = 10;

/** 1면 주인공 — 수익률 1·2·3위 + 4~10위 */
function RankingFront({ reports }: { reports: ReportSummary[] }) {
  const [period, setPeriod] = useState<Period>('all');
  const top = useMemo(() => computeTopReturns(reports, period, RANK_LIMIT), [reports, period]);
  const podium = top.slice(0, 3);

  return (
    <section aria-label="수익률 순위">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b-2 border-[var(--theme-border)] pb-2 mb-5">
        <h2 className="headline text-[26px] sm:text-[30px] leading-tight">수익률 순위</h2>
        <div className="flex items-center gap-3 text-sm">
          {PERIOD_KEYS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={period === p ? 'font-bold text-[var(--foreground)] border-b-2 border-[var(--theme-border)] pb-0.5' : 'text-[var(--theme-ink-soft)] hover:text-[var(--foreground)] pb-0.5 border-b-2 border-transparent'}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
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
                <PodiumCard item={r} />
              </div>
            ))}
          </div>
          <Leaderboard items={top.slice(3)} period={period} />
          <Link href="/ranking" className="mt-3 inline-block text-sm font-bold hover:underline underline-offset-4">
            전체 랭킹 보기 →
          </Link>
        </>
      ) : (
        <p className="py-8 text-center text-sm text-[var(--theme-ink-soft)]">해당 기간 수익률 데이터가 충분하지 않습니다.</p>
      )}
    </section>
  );
}

/** 오른쪽 — 모닝 브리핑 (해외 매체 헤드라인으로 고르고 AI 가 조사해 새로 쓴 헤드라인) */
function BriefingColumn({ briefing }: { briefing: Briefing | null }) {
  return (
    <section aria-label="모닝 브리핑">
      <h2 className="headline text-[22px] border-b-2 border-[var(--theme-border)] pb-1.5">모닝 브리핑</h2>
      {briefing ? (
        <>
          {briefing.isStale && (
            <p suppressHydrationWarning className="mt-2 text-xs text-[var(--theme-ink-soft)]">
              {DATE_KR.format(new Date(briefing.generatedAt))} 지난 호
            </p>
          )}
          <ol className="mt-1">
            {briefing.issues.slice(0, 5).map((issue, i) => (
              <li key={i} className="flex gap-3 py-2.5 border-b border-[var(--theme-border-muted)] last:border-b-0">
                <span className="flex-shrink-0 w-5 font-serif font-black text-[var(--theme-orange)]">{i + 1}</span>
                <h3 className="min-w-0 headline text-[15px] leading-snug break-keep">{issue.headline}</h3>
              </li>
            ))}
          </ol>
          <Link href="/briefing" className="mt-2 inline-block text-xs font-bold hover:underline">
            {briefing.issues.length}개 전체 보기 →
          </Link>
        </>
      ) : (
        <p className="mt-2 text-sm text-[var(--theme-ink-soft)]">
          밤사이 해외 주요 매체가 다룬 이슈를 골라 아침 6시에 10개로 정리해 드립니다. (준비 중)
        </p>
      )}
    </section>
  );
}

/** 오른쪽 — 구루 포트폴리오 바로가기 */
function GuruColumn() {
  return (
    <section aria-label="구루 포트폴리오">
      <h2 className="headline text-[22px] border-b-2 border-[var(--theme-border)] pb-1.5">구루 포트폴리오</h2>
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

interface FrontPageProps {
  reports: ReportSummary[];
  briefing: Briefing | null;
}

const FrontPage = memo(function FrontPage({ reports, briefing }: FrontPageProps) {
  if (reports.length === 0) return null;

  return (
    <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-0">
      <div className="min-w-0 lg:col-span-8 lg:pr-8">
        <RankingFront reports={reports} />
      </div>
      <aside className="min-w-0 lg:col-span-4 lg:pl-8 lg:border-l lg:border-[var(--theme-border-muted)] space-y-10">
        <BriefingColumn briefing={briefing} />
        <GuruColumn />
      </aside>
    </div>
  );
});

export default FrontPage;
