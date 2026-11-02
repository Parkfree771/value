// 수익률 순위 공용 지면 — 홈 1면과 랭킹 페이지가 같은 모양을 쓴다.
// 1위 크게 + 2·3위 옆에 쌓기 + 4위부터 순위표. 읽는 순서는 어디서나 수익률 → 종목 → 제목 → 작성자.

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { ReportSummary } from '@/types/report';
import UserLevelInline from '@/components/UserLevelInline';
import { RankChangeIndicator, formatRate, returnColorClass } from '@/components/front/ranking';
import { stockLabel, heldDaysLabel, exchangeLabel } from '@/utils/reportDisplay';
import { inferCurrency, formatPrice } from '@/utils/currency';

const OPINION_LABEL: Record<string, string> = { buy: '매수', sell: '매도', hold: '보유' };
const OPINION_COLOR: Record<string, string> = { buy: 'text-[var(--color-up)]', sell: 'text-[var(--color-down)]' };

export type PodiumReport = Pick<
  ReportSummary,
  'id' | 'title' | 'author' | 'levelPoints' | 'stockName' | 'ticker' | 'exchange' | 'category' | 'opinion' | 'initialPrice' | 'currentPrice' | 'createdAt'
>;
export type PodiumItem = PodiumReport & { rank: number; displayRate: number };

/** 상장사 · 매수/매도 */
function StockTags({ report }: { report: PodiumReport }) {
  const ex = exchangeLabel(report.exchange);
  return (
    <>
      {ex && <span className="flex-shrink-0 text-xs text-[var(--theme-ink-soft)]">{ex}</span>}
      <span className={`flex-shrink-0 text-xs font-bold ${OPINION_COLOR[report.opinion] ?? 'text-[var(--theme-ink-soft)]'}`}>
        {OPINION_LABEL[report.opinion] ?? ''}
      </span>
    </>
  );
}

/** 종목 줄 — 종목(본문색 굵게) · 상장사(작은 회색) · 매수 빨강 / 매도 파랑 */
function StockLine({ report, nameClass }: { report: PodiumReport; nameClass: string }) {
  return (
    <>
      <span className={`truncate font-bold text-[var(--foreground)] ${nameClass}`}>{stockLabel(report.stockName, report.ticker)}</span>
      <StockTags report={report} />
    </>
  );
}

/** 작성자 · 날짜 한 줄 */
function ByLine({ item }: { item: PodiumReport }) {
  return (
    <div className="flex items-center gap-x-1.5 min-w-0 text-xs text-[var(--theme-ink-soft)]">
      <span className="truncate font-semibold text-[var(--foreground)]">{item.author}</span>
      <UserLevelInline points={item.levelPoints} />
      <span suppressHydrationWarning className="flex-shrink-0 tabular-nums">· {item.createdAt}</span>
    </div>
  );
}

/** 순위 배지 — 1위는 오렌지로 채우고, 2·3위는 테두리만 */
export function RankBadge({ rank, large = false }: { rank: number; large?: boolean }) {
  const tone = rank === 1
    ? 'bg-[var(--theme-orange)] border-[var(--theme-orange)] text-white'
    : 'border-[var(--theme-border-muted)] text-[var(--foreground)]';
  const size = large ? 'px-2 py-1 text-sm' : 'px-1.5 py-0.5 text-xs';
  return <span className={`flex-shrink-0 border font-bold leading-none ${size} ${tone}`}>{rank}위</span>;
}

/** 작성 당시 · 현재가 두 칸 */
function PriceBox({ item }: { item: PodiumItem }) {
  if (!(item.initialPrice > 0 && item.currentPrice > 0)) return null;
  const currency = inferCurrency({ exchange: item.exchange, category: item.category, ticker: item.ticker });
  return (
    <dl className="mt-3 pt-3 grid grid-cols-2 border-t border-[var(--theme-border-muted)]">
      <div>
        <dt className="text-xs text-[var(--theme-ink-soft)]">작성 당시</dt>
        <dd className="mt-0.5 font-mono font-bold tabular-nums text-[15px] text-[var(--foreground)]">{formatPrice(item.initialPrice, currency)}</dd>
      </div>
      <div>
        <dt className="text-xs text-[var(--theme-ink-soft)]">현재가</dt>
        <dd className="mt-0.5 font-mono font-bold tabular-nums text-[15px] text-[var(--foreground)]">{formatPrice(item.currentPrice, currency)}</dd>
      </div>
    </dl>
  );
}

/** 1위 — 왼쪽 큰 칸. 윗줄: 순위 · 기업 · 상장 · 매수 … 오른쪽 끝 수익률 / 아래: 제목 · 작성자 · 작성가와 현재가 */
function LeadCard({ item }: { item: PodiumItem }) {
  return (
    <article className="group min-w-0">
      <div className="flex items-baseline gap-x-2.5">
        <RankBadge rank={item.rank} />
        <p className="min-w-0 flex-1 flex items-baseline gap-x-1.5 whitespace-nowrap overflow-hidden">
          <StockLine report={item} nameClass="text-[18px]" />
        </p>
        <span className={`flex-shrink-0 font-mono font-black tracking-tight leading-none text-[26px] sm:text-[30px] ${returnColorClass(item.displayRate)}`}>
          {formatRate(item.displayRate)}
        </span>
      </div>
      <h3 className="headline mt-3 text-[19px] leading-snug line-clamp-2 break-keep">
        <Link href={`/reports/${item.id}`} className="group-hover:underline underline-offset-4">{item.title}</Link>
      </h3>
      <div className="mt-2"><ByLine item={item} /></div>
      <PriceBox item={item} />
    </article>
  );
}

/** 2·3위 — 오른쪽에 위아래로. 1위와 같은 윗줄 구조. 칸이 좁아 상장 · 매수는 아랫줄로 */
function RunnerCard({ item }: { item: PodiumItem }) {
  return (
    <article className="group min-w-0 py-4 first:pt-0 last:pb-0">
      <div className="flex items-baseline gap-x-2">
        <RankBadge rank={item.rank} />
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-[var(--foreground)]">{stockLabel(item.stockName, item.ticker)}</span>
        <span className={`flex-shrink-0 font-mono font-black tracking-tight leading-none text-[20px] ${returnColorClass(item.displayRate)}`}>
          {formatRate(item.displayRate)}
        </span>
      </div>
      <h3 className="mt-1.5 truncate text-[13px] text-[var(--theme-ink-soft)]">
        <Link href={`/reports/${item.id}`} className="group-hover:underline underline-offset-4">{item.title}</Link>
      </h3>
      <div className="mt-1 flex items-baseline gap-x-1.5 whitespace-nowrap overflow-hidden">
        <StockTags report={item} />
        <span className="min-w-0 flex-1"><ByLine item={item} /></span>
      </div>
    </article>
  );
}

/** 1·2·3위 묶음 — 데스크탑: 왼쪽 1위 / 오른쪽 2·3위 쌓기. 모바일: 위에서 아래로 */
export function Podium({ items }: { items: PodiumItem[] }) {
  const [lead, ...runners] = items;
  if (!lead) return null;
  return (
    <div className="md:grid md:grid-cols-[3fr_2fr]">
      <div className="min-w-0 md:pr-6">
        <LeadCard item={lead} />
      </div>
      {runners.length > 0 && (
        <div className="min-w-0 mt-4 pt-4 border-t border-[var(--theme-border-muted)] divide-y divide-[var(--theme-border-muted)] md:mt-0 md:pt-0 md:pl-6 md:border-t-0 md:border-l">
          {runners.map((r) => (
            <RunnerCard key={r.id} item={r} />
          ))}
        </div>
      )}
    </div>
  );
}

/** 랭킹 페이지 1·2·3위 — 넓은 지면에 카드 세 장. 위 굵은 띠와 큰 수익률로 순위표와 확실히 구분 */
function SpotlightFrame({ rank, rate, head, children }: { rank: number; rate: number; head: ReactNode; children: ReactNode }) {
  const first = rank === 1;
  return (
    <article className={`group h-full flex flex-col min-w-0 border-t-4 p-4 sm:p-5 ${first ? 'border-[var(--theme-orange)] bg-[var(--theme-orange)]/[0.06]' : 'border-[var(--theme-border)] bg-[var(--theme-bg-card)]'}`}>
      <div className="flex items-baseline gap-x-2">
        <RankBadge rank={rank} large />
        <p className={`min-w-0 flex-1 flex items-baseline gap-x-1.5 whitespace-nowrap overflow-hidden ${first ? '[--name-size:20px]' : '[--name-size:17px]'}`}>
          {head}
        </p>
      </div>
      <p className={`mt-3 font-mono font-black tracking-tight leading-none ${first ? 'text-[42px] md:text-[36px] lg:text-[48px]' : 'text-[32px] md:text-[28px] lg:text-[36px]'} ${returnColorClass(rate)}`}>
        {formatRate(rate)}
      </p>
      {children}
    </article>
  );
}

const SPOTLIGHT_GRID = 'grid gap-3 md:grid-cols-[1.35fr_1fr_1fr]';

export function Spotlight({ items }: { items: PodiumItem[] }) {
  return (
    <div className={SPOTLIGHT_GRID}>
      {items.map((item) => (
        <SpotlightFrame key={item.id} rank={item.rank} rate={item.displayRate} head={<StockLine report={item} nameClass="text-[length:var(--name-size)]" />}>
          <h3 className="headline mt-3 text-[17px] leading-snug line-clamp-2 break-keep">
            <Link href={`/reports/${item.id}`} className="group-hover:underline underline-offset-4">{item.title}</Link>
          </h3>
          <div className="mt-2 mb-auto"><ByLine item={item} /></div>
          <PriceBox item={item} />
        </SpotlightFrame>
      ))}
    </div>
  );
}

export interface SpotlightInvestor {
  rank: number;
  name: string;
  avgReturnRate: number;
  totalReports: number;
  totalLikes: number;
  winCount: number;
  levelPoints?: number;
}

/** 투자자 1·2·3위 — 리포트 카드와 같은 틀에 이름 · 평균 수익률 · 승률 · 좋아요 */
export function InvestorSpotlight({ items }: { items: SpotlightInvestor[] }) {
  return (
    <div className={SPOTLIGHT_GRID}>
      {items.map((investor) => (
        <SpotlightFrame
          key={investor.name}
          rank={investor.rank}
          rate={investor.avgReturnRate}
          head={
            <>
              <Link href={`/user/${encodeURIComponent(investor.name)}`} className="truncate font-bold text-[length:var(--name-size)] text-[var(--foreground)] group-hover:underline underline-offset-4">
                {investor.name}
              </Link>
              <UserLevelInline points={investor.levelPoints} />
            </>
          }
        >
          <dl className="mt-3 pt-3 grid grid-cols-2 border-t border-[var(--theme-border-muted)]">
            <div>
              <dt className="text-xs text-[var(--theme-ink-soft)]">승률</dt>
              <dd className="mt-0.5 font-bold tabular-nums text-[15px] text-[var(--foreground)]">
                <span className="font-mono">{Math.round((investor.winCount / investor.totalReports) * 100)}%</span>
                <span className="ml-1 text-xs font-normal text-[var(--theme-ink-soft)]">{investor.totalReports}편 중 {investor.winCount}편</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--theme-ink-soft)]">좋아요</dt>
              <dd className="mt-0.5 font-mono font-bold tabular-nums text-[15px] text-[var(--foreground)]">{investor.totalLikes.toLocaleString()}</dd>
            </div>
          </dl>
        </SpotlightFrame>
      ))}
    </div>
  );
}

/** 순위표 오른쪽 아랫줄 — 보유 기간 · 작성가 → 현재가 (모바일은 보유 기간만) */
export function PriceDetail({ report }: { report: PodiumReport }) {
  if (!(report.initialPrice > 0 && report.currentPrice > 0)) return null;
  const currency = inferCurrency({ exchange: report.exchange, category: report.category, ticker: report.ticker });
  return (
    <>
      {heldDaysLabel(report.createdAt)}
      <span className="hidden sm:inline"> · {formatPrice(report.initialPrice, currency)} → {formatPrice(report.currentPrice, currency)}</span>
    </>
  );
}

/** 순위표 한 줄 — 왼쪽 종목 · 제목 · 작성자, 오른쪽 수익률 · 부가 정보 */
export function RankRow({ report, rank, rate, rankChange = 0, detail, className = '' }: {
  report: PodiumReport;
  rank: number;
  rate: number;
  rankChange?: number;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <li className={`border-b border-[var(--theme-border-muted)] ${className}`}>
      <Link href={`/reports/${report.id}`} className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2 py-2.5">
        <span className="font-serif text-lg font-black text-[var(--theme-ink-soft)]">{rank}</span>
        <span className="min-w-0">
          <span className="flex items-baseline gap-x-1.5 whitespace-nowrap overflow-hidden">
            <StockLine report={report} nameClass="text-[15px]" />
          </span>
          <span className="mt-0.5 flex items-center gap-x-1.5 text-xs text-[var(--theme-ink-soft)] whitespace-nowrap overflow-hidden">
            <span className="truncate group-hover:underline underline-offset-4">{report.title}</span>
            <span className="hidden sm:inline flex-shrink-0">· {report.author}</span>
            <span className="hidden sm:inline-flex"><UserLevelInline points={report.levelPoints} /></span>
          </span>
        </span>
        <span className="text-right">
          <span className="flex items-baseline justify-end gap-1.5">
            <RankChangeIndicator change={rankChange} />
            <span className={`font-mono font-black tabular-nums ${returnColorClass(rate)}`}>{formatRate(rate)}</span>
          </span>
          <span suppressHydrationWarning className="mt-0.5 block text-xs tabular-nums whitespace-nowrap text-[var(--theme-ink-soft)]">
            {detail}
          </span>
        </span>
      </Link>
    </li>
  );
}
