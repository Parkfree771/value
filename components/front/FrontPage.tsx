'use client';

import { memo, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ReportSummary } from '@/types/report';
import type { Briefing } from '@/lib/briefing';
import {
  computeTopReturns,
  PERIOD_KEYS,
  PERIOD_LABELS,
  formatRate,
  type Period,
  type RankedReport,
} from '@/components/front/ranking';
import { Podium, PriceDetail, RankRow } from '@/components/front/podium';
import SectionBand from '@/components/front/SectionBand';
import { GURU_LIST } from '@/app/guru-tracker/types';

// 홈 1면 — 주인공은 "수익률 1·2·3위" (AntStreet 만의 지면).
// 신문 문법(흰 바탕 · 괘선 · 명조 제목)만 빌리고, 배치는 순위 중심: 1위 크게 + 2·3위 옆에 쌓기 + 4~10위 순위표 / 오른쪽 브리핑·구루.
// 읽는 순서는 어디서나 수익률 → 종목 → 제목 → 작성자.
// 전체 글은 바로 아래 "모든 리포트" 가 보여 주므로 1면은 순위와 요약만 둔다.

// 'en-US' 는 11/2 꼴로 나온다
const DATE_SHORT = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' });

// 모바일은 5위까지만 — 나머지는 "전체 랭킹 보기"로
const MOBILE_RANK_LIMIT = 5;

/** 4위부터 순위표 — 전체 탭은 보유 기간 · 가격, 기간 탭은 누적 수익률 */
function Leaderboard({ items, period }: { items: RankedReport[]; period: Period }) {
  if (items.length === 0) return null;
  return (
    <ol className="mt-6 border-t-2 border-[var(--theme-border)]">
      {items.map((r) => (
        <RankRow
          key={r.id}
          report={r}
          rank={r.rank}
          rate={r.displayRate}
          rankChange={r.rankChange}
          detail={period === 'all' ? <PriceDetail report={r} /> : <>누적 {formatRate(r.returnRate)}</>}
          className={r.rank > MOBILE_RANK_LIMIT ? 'hidden md:block' : ''}
        />
      ))}
    </ol>
  );
}

// 1면 순위 — 1·2·3위 + 4~10위. 그 뒤는 랭킹 페이지
const RANK_LIMIT = 10;

/** 1면 주인공 — 수익률 1·2·3위 + 4~10위 */
function RankingFront({ reports }: { reports: ReportSummary[] }) {
  const [period, setPeriod] = useState<Period>('all');
  const top = useMemo(() => computeTopReturns(reports, period, RANK_LIMIT), [reports, period]);

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
              className={period === p ? 'font-bold text-[var(--foreground)] border-b-2 border-[var(--theme-border)] py-1 md:py-0 md:pb-0.5' : 'text-[var(--theme-ink-soft)] hover:text-[var(--foreground)] py-1 md:py-0 md:pb-0.5 border-b-2 border-transparent'}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {top.length > 0 ? (
        <>
          <Podium items={top.slice(0, 3)} />
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

/** 오른쪽 — 신문 지면. 첫 기사는 큰 헤드라인 + 요약, 나머지는 괘선으로 나눈 헤드라인
 *  (해외 매체 헤드라인으로 고르고 AI 가 조사해 새로 쓴 헤드라인) */
function BriefingColumn({ briefing }: { briefing: Briefing | null }) {
  const [top, ...rest] = briefing?.issues.slice(0, 5) ?? [];

  return (
    <section aria-label="오늘의 헤드라인">
      {/* 모바일은 화면 끝까지 꽉 찬 띠 */}
      <div className="-mx-4 sm:-mx-6 md:mx-0 flex items-baseline justify-between gap-3 bg-[var(--theme-press-red)] px-4 sm:px-6 md:px-3 py-2">
        <h2 className="font-[family-name:var(--font-masthead)] text-[15px] font-extrabold tracking-[0.12em] text-white">HEADLINES</h2>
        {briefing && (
          <span suppressHydrationWarning className="font-[family-name:var(--font-masthead)] text-[15px] font-extrabold tabular-nums text-white">
            {DATE_SHORT.format(new Date(briefing.generatedAt))}{briefing.isStale ? ' 지난 호' : ''}
          </span>
        )}
      </div>
      {briefing && top ? (
        <>
          <article className="group pt-4 pb-4 border-b border-[var(--theme-border)]">
            <Link href="/briefing">
              <h3 className="headline text-[26px] leading-[1.25] break-keep group-hover:underline underline-offset-4">{top.headline}</h3>
              <p className="mt-2.5 font-serif text-sm leading-relaxed text-[var(--theme-ink-soft)] line-clamp-3">{top.summary}</p>
            </Link>
          </article>
          <ul>
            {rest.map((issue, i) => (
              <li key={i} className="border-b border-[var(--theme-border-muted)] last:border-b-0">
                <Link href="/briefing" className="group block py-3">
                  <h3 className="headline text-[16px] leading-snug break-keep group-hover:underline underline-offset-4">{issue.headline}</h3>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/briefing" className="mt-2 inline-block text-xs font-bold hover:underline">
            기사 {briefing.issues.length}건 전체 보기 →
          </Link>
        </>
      ) : (
        <p className="mt-2 text-sm text-[var(--theme-ink-soft)]">
          매일 아침 6시, 오늘 꼭 알아야 할 경제 이슈 10개를 정리해 드립니다. (준비 중)
        </p>
      )}
    </section>
  );
}

/** 오른쪽 — 구루 포트폴리오 바로가기 */
function GuruColumn() {
  return (
    <section aria-label="구루 포트폴리오">
      <SectionBand
        label="GURU PORTFOLIO"
        right={<Link href="/guru-tracker" className="-my-2 inline-block py-2">더보기 →</Link>}
      />
      <div className="hidden md:flex items-baseline justify-between gap-3 border-b-2 border-[var(--theme-border)] pb-1.5">
        <h2 className="headline text-[22px]">구루 포트폴리오</h2>
        <Link href="/guru-tracker" className="text-xs font-bold hover:underline underline-offset-4">더보기 →</Link>
      </div>
      {/* 모바일: 옆으로 밀어서 보는 한 줄 / 데스크탑: 세로 목록 */}
      <ul className="-mx-4 px-4 flex gap-5 overflow-x-auto scrollbar-hide sm:mx-0 sm:px-0 lg:block">
        {GURU_LIST.slice(0, 5).map((g) => (
          <li key={g.cik} className="flex-shrink-0 lg:border-b lg:border-[var(--theme-border-muted)] lg:last:border-b-0">
            <Link href={`/portfolio/${g.name_en.toLowerCase().replace(/\s+/g, '-')}`} className="group flex flex-col lg:flex-row lg:items-baseline lg:justify-between lg:gap-3 py-2.5">
              <span className="headline text-[15px] group-hover:underline underline-offset-4">{g.name_kr}</span>
              <span className="text-xs text-[var(--theme-ink-soft)]">{g.style}</span>
            </Link>
          </li>
        ))}
      </ul>
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
