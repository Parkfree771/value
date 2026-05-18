'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import Link from 'next/link';
import UserBadgeInline from './UserBadgeInline';
import podiumStyles from './Podium.module.css';

interface TopReturn {
  id: string;
  rank: number;
  rankChange: number;
  title: string;
  stockName: string;
  ticker: string;
  returnRate: number;
  author: string;
  equippedBadgeId?: string | null;
  createdAt: string;
}

type Period = 'all' | '1d' | '1w' | '1m';

const PERIOD_LABELS: Record<Period, string> = {
  all: '전체',
  '1d': '1일',
  '1w': '7일',
  '1m': '한달',
};
const PERIOD_KEYS: Period[] = ['all', '1d', '1w', '1m'];

interface TopReturnSliderProps {
  reports?: Array<{
    id: string;
    title: string;
    stockName: string;
    ticker: string;
    returnRate: number;
    prevReturnRate?: number;
    returnRate1D?: number | null;
    returnRate1W?: number | null;
    returnRate1M?: number | null;
    author: string;
    equippedBadgeId?: string | null;
    createdAt: string;
  }>;
}

// 직전 가격 업데이트 대비 랭킹 변동 (양수: 상승, 음수: 하락, 0: 변동 없음)
function RankChangeIndicator({ change, className = '' }: { change: number; className?: string }) {
  if (change === 0) return null;
  const isUp = change > 0;
  const colorClass = isUp
    ? 'text-red-600 dark:text-red-400'
    : 'text-blue-600 dark:text-blue-400';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-bold font-mono ${colorClass} ${className}`}>
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {isUp ? (
          <>
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </>
        ) : (
          <>
            <path d="M12 5v14" />
            <path d="m19 12-7 7-7-7" />
          </>
        )}
      </svg>
      {Math.abs(change)}
    </span>
  );
}

const TopReturnSlider = memo(function TopReturnSlider({ reports = [] }: TopReturnSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [period, setPeriod] = useState<Period>('1m');

  // 선택 기간 기준 수익률 상위 10개 (직전 업데이트 대비 ▲▼는 전체 탭에서만)
  const topReturns = useMemo(() => {
    if (reports.length === 0) return [];

    const pickRate = (r: NonNullable<TopReturnSliderProps['reports']>[number]): number | null => {
      if (period === 'all') return r.returnRate;
      if (period === '1d') return r.returnRate1D ?? null;
      if (period === '1w') return r.returnRate1W ?? null;
      return r.returnRate1M ?? null;
    };

    const enriched = reports
      .map((r) => ({ ...r, displayRate: pickRate(r) }))
      .filter((r): r is typeof r & { displayRate: number } => r.displayRate !== null && Number.isFinite(r.displayRate));

    const top10 = enriched
      .sort((a, b) => b.displayRate - a.displayRate)
      .slice(0, 10);

    // 전체 탭에서만 직전 대비 순위 변동 계산 (기간 탭엔 prev 데이터 없음)
    if (period !== 'all') {
      return top10.map((report, index) => ({
        ...report,
        rank: index + 1,
        rankChange: 0,
      }));
    }

    const prevRankMap = new Map<string, number>();
    [...top10]
      .sort((a, b) => (b.prevReturnRate ?? b.returnRate) - (a.prevReturnRate ?? a.returnRate))
      .forEach((r, i) => prevRankMap.set(r.id, i + 1));

    return top10.map((report, index) => {
      const currentRank = index + 1;
      const prevRank = prevRankMap.get(report.id) ?? currentRank;
      return {
        ...report,
        rank: currentRank,
        rankChange: prevRank - currentRank,
      };
    });
  }, [reports, period]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [period]);

  useEffect(() => {
    if (topReturns.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % topReturns.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [topReturns.length]);

  // 토글 버튼은 데이터가 없을 때도 보여서 다른 기간으로 전환 가능하게
  const hasAnyData = reports.length > 0;

  const getRankNumber = (rank: number) => {
    if (rank <= 3) {
      const rankClass = `${podiumStyles.rankNumber} ${
        rank === 1 ? podiumStyles.rankFirst : rank === 2 ? podiumStyles.rankSecond : podiumStyles.rankThird
      }`;
      return <div className={rankClass}>{rank}</div>;
    }
    return (
      <span className="w-7 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
        {rank}
      </span>
    );
  };

  const getCardInfo = (rank: number, isActive: boolean) => {
    if (rank === 1) {
      return {
        className: 'border-[var(--theme-accent)] bg-[var(--theme-bg-card)]',
        shadow: isActive ? '4px 4px 0px var(--theme-accent)' : 'var(--shadow-md)',
      };
    } else if (rank === 2) {
      return {
        className: 'border-[#d97706] dark:border-[#b45309] bg-[var(--theme-bg-card)]',
        shadow: isActive ? '4px 4px 0px #d97706' : 'var(--shadow-md)',
      };
    } else if (rank === 3) {
      return {
        className: 'border-[#9ca3af] dark:border-[#6b7280] bg-[var(--theme-bg-card)]',
        shadow: isActive ? '4px 4px 0px #9ca3af' : 'var(--shadow-md)',
      };
    } else if (isActive) {
      return {
        className: 'bg-ant-red-50 dark:bg-ant-red-900/20 border-ant-red-500 dark:border-ant-red-500',
        shadow: '',
      };
    }
    return {
      className: 'card-base hover:bg-gray-50 dark:hover:bg-gray-700',
      shadow: '',
    };
  };

  const getReturnColorClass = (returnRate: number) => {
    if (returnRate > 0) return 'return-positive';
    if (returnRate < 0) return 'return-negative';
    return 'return-neutral';
  };

  if (!hasAnyData) return null;

  const periodHint: Record<Period, string> = {
    all: '가장 높은 수익률을 기록한 리포트',
    '1d': '최근 1거래일 동안 가장 많이 오른 종목',
    '1w': '최근 7일 동안 가장 많이 오른 종목',
    '1m': '최근 30일 동안 가장 많이 오른 종목',
  };

  const periodButtonClass = (active: boolean) =>
    `flex-shrink-0 font-heading tracking-tight sm:tracking-wide text-xs sm:text-sm px-1.5 py-0.5 sm:px-3 sm:py-1.5 transition-all ${
      active
        ? 'font-black text-[var(--theme-accent)] underline decoration-2 decoration-[var(--theme-accent)] underline-offset-4'
        : 'font-bold text-gray-700 dark:text-gray-300 hover:text-[var(--theme-accent)]'
    }`;

  return (
    <div className="mb-4 sm:mb-8">
      {/* Header — 모바일 */}
      <div className="sm:hidden mb-1.5 flex items-baseline justify-between gap-2">
        <h2 className="text-lg text-heading">수익률 TOP 10</h2>
        <div className="flex gap-1 flex-nowrap items-baseline flex-shrink-0">
          {PERIOD_KEYS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={periodButtonClass(period === p)}
              aria-pressed={period === p}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Header — 데스크탑 */}
      <div className="hidden sm:block mb-5">
        <h2 className="text-xl text-heading leading-tight">수익률 TOP 10</h2>
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm text-muted">{periodHint[period]}</p>
          <div className="flex gap-1 flex-nowrap items-center flex-shrink-0">
            {PERIOD_KEYS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={periodButtonClass(period === p)}
                aria-pressed={period === p}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {topReturns.length === 0 && (
        <div className="card-base py-8 text-center">
          <p className="text-sm text-muted">해당 기간 수익률 데이터가 충분하지 않습니다.</p>
        </div>
      )}

      {/* 모바일: 세로 리스트 (박스 안에서 터치 스크롤, 스크롤바는 숨김) */}
      {topReturns.length > 0 && (
      <div className="sm:hidden card-base overflow-hidden">
        <div className="max-h-[176px] overflow-y-auto scrollbar-hide divide-y-2 divide-[var(--theme-border-muted)]">
          {topReturns.map((item) => {
            const rankColor =
              item.rank === 1 ? 'text-[var(--theme-accent)]' :
              item.rank === 2 ? 'text-[#d97706] dark:text-[#fbbf24]' :
              item.rank === 3 ? 'text-[#6b7280] dark:text-[#9ca3af]' :
              'text-gray-500 dark:text-gray-400';
            return (
              <Link key={item.id} href={`/reports/${item.id}`}>
                <div className="flex items-center gap-3 h-[44px] px-3 active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
                  <div className="flex-shrink-0 w-7 flex items-center justify-center">
                    <span className={`w-7 text-center text-sm font-bold ${rankColor}`}>
                      {item.rank}
                    </span>
                  </div>
                  <span className="flex-1 min-w-0 text-sm font-semibold text-gray-900 dark:text-white truncate">{item.stockName} <span className="font-normal text-xs text-gray-400 font-mono">{item.ticker}</span></span>
                  <RankChangeIndicator change={item.rankChange} className="flex-shrink-0" />
                  <span className={`text-sm font-bold font-mono tabular-nums flex-shrink-0 ${getReturnColorClass(item.displayRate)}`}>
                    {item.displayRate >= 0 ? '+' : ''}{item.displayRate.toFixed(2)}%
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      )}

      {/* 데스크탑: 가로 슬라이더 */}
      {topReturns.length > 0 && (
      <div className="hidden sm:block">
        <div className="relative -mx-4 px-4">
          <div className="scroll-container flex gap-4 px-[6px]">
            {topReturns.map((item, index) => {
              const isActive = currentIndex === index;
              const info = getCardInfo(item.rank, isActive);

              return (
              <Link key={item.id} href={`/reports/${item.id}`}>
                <div
                  className={`flex-shrink-0 w-80 p-5 rounded-xl transition-all cursor-pointer snap-start ${
                    item.rank <= 3 ? 'border-2' : 'border-2'
                  } ${info.className} ${isActive ? 'scale-[1.02]' : ''}`}
                  style={info.shadow ? { boxShadow: info.shadow } : undefined}
                  onMouseEnter={() => setCurrentIndex(index)}
                >
                  {/* Rank + Author */}
                  <div className="flex items-start gap-3 mb-3 h-[56px]">
                    <div className="flex-shrink-0 pt-0.5">
                      {getRankNumber(item.rank)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-lg text-heading truncate min-w-0 inline-flex items-center gap-1">
                          <UserBadgeInline badgeId={item.equippedBadgeId} nickname={item.author} size={16} />
                          {item.author}
                        </h3>
                        <RankChangeIndicator change={item.rankChange} className="flex-shrink-0" />
                      </div>
                      <h4 className="text-sm text-subheading mb-2 line-clamp-2 min-h-[2.5rem]">{item.title}</h4>
                    </div>
                  </div>

                  {/* Return Rate */}
                  <div className="mb-2 h-[40px] flex items-center">
                    <div className={`text-3xl font-black font-heading font-mono ${getReturnColorClass(item.displayRate)}`}>
                      {item.displayRate >= 0 ? '+' : ''}{item.displayRate.toFixed(2)}%
                    </div>
                  </div>

                  {/* Stock Info and Date */}
                  <div className="flex flex-col text-xs text-muted">
                    <span className="font-semibold truncate max-w-[200px]">{item.stockName} <span className="font-normal">{item.ticker}</span></span>
                    <span className="mt-0.5">{item.createdAt}</span>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        </div>
      </div>
      )}
    </div>
  );
});

export default TopReturnSlider;
