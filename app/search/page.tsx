'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import ReportCard from '@/components/ReportCard';
import SearchBar, { type StockSuggestion } from '@/components/SearchBar';
import Container from '@/components/Container';
import { InlineLoading } from '@/components/loading/Loading';
import { loadThemes, getSymbolsForThemes } from '@/lib/themeStocks';
import type { Theme } from '@/types/theme';
import { matchesReport } from '@/utils/reportSearch';
import { shortStockName, exchangeLabel } from '@/utils/reportDisplay';

// 종목 · 리포트 검색
// - 검색창: 종목 자동완성(별칭·초성 포함) + 제목·작성자·종목명 텍스트 검색
// - 종목을 고르면 그 종목 리포트만 + 의견 분포·평균 수익률 요약
// - 아무것도 안 쳤을 때: 리포트가 많은 종목 바로가기 + 전체 리포트

type SortType = 'latest' | 'returnDesc' | 'returnAsc' | 'popular';
type MarketFilter = 'all' | 'KR' | 'US' | 'JP' | 'CN' | 'HK';

const SORT_LABELS: Record<SortType, string> = { latest: '최신순', returnDesc: '수익률 높은순', returnAsc: '수익률 낮은순', popular: '조회순' };
const MARKET_LABELS: Record<MarketFilter, string> = { all: '전체', KR: '한국', US: '미국', JP: '일본', CN: '중국', HK: '홍콩' };
const MARKET_EXCHANGES: Record<string, string[]> = {
  KR: ['KRX'], US: ['NAS', 'NYS', 'AMS'], JP: ['TSE'], CN: ['SHS', 'SZS'], HK: ['HKS'],
};
const PAGE = 20;

const TAB = (active: boolean) =>
  `flex-shrink-0 px-2 py-1 text-[13px] border-b-2 transition-colors ${
    active ? 'font-bold border-[var(--theme-border)]' : 'border-transparent text-[var(--theme-ink-soft)] hover:text-[var(--foreground)]'
  }`;
const CHIP = (active: boolean) =>
  `flex-shrink-0 px-2.5 py-1 text-xs border rounded-[2px] transition-colors ${
    active ? 'pixel-chip-active font-bold' : 'border-[var(--theme-border-control)] hover:border-[var(--theme-border)]'
  }`;

interface FeedReport {
  id: string;
  title: string;
  author: string;
  ticker: string;
  stockName: string;
  exchange: string;
  opinion: 'buy' | 'sell' | 'hold';
  returnRate: number;
  views: number;
  createdAt: string;
  themes?: string[];
  [key: string]: unknown;
}

interface PickedStock {
  symbol: string;
  name: string;
  exchange: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [suggestedTickers, setSuggestedTickers] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<PickedStock | null>(null);
  const [reports, setReports] = useState<FeedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [allThemes, setAllThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [sortType, setSortType] = useState<SortType>('latest');
  const [market, setMarket] = useState<MarketFilter>('all');
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    fetch('/api/feed/public')
      .then((r) => r.json())
      .then((data) => setReports(data.posts || []))
      .catch((e) => console.error('리포트 가져오기 실패:', e))
      .finally(() => setLoading(false));
    loadThemes().then(setAllThemes).catch(console.error);
  }, []);

  // 필터가 바뀌면 처음 20개부터
  useEffect(() => setVisible(PAGE), [query, picked, selectedTheme, market, sortType]);

  const handleSuggestions = useCallback((stocks: StockSuggestion[]) => {
    // 자동완성 상위 5개 종목의 리포트도 텍스트 검색에 포함 ("하닉" → SK하이닉스 리포트)
    setSuggestedTickers(new Set(stocks.slice(0, 5).map((s) => s.symbol.toUpperCase())));
  }, []);

  const handlePick = useCallback((stock: StockSuggestion) => {
    setPicked({ symbol: stock.symbol.toUpperCase(), name: stock.nameKr || shortStockName(stock.name, stock.symbol), exchange: stock.exchange });
    setQuery('');
    setSuggestedTickers(new Set());
  }, []);

  const pickFromReports = (ticker: string, name: string, exchange: string) => {
    setPicked({ symbol: ticker.toUpperCase(), name, exchange });
    setQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const themeSymbols = useMemo(
    () => (selectedTheme && allThemes.length ? getSymbolsForThemes(allThemes, [selectedTheme]) : null),
    [selectedTheme, allThemes],
  );

  const filtered = useMemo(() => {
    const list = reports.filter((r) => {
      const ticker = (r.ticker || '').toUpperCase();
      if (picked && ticker !== picked.symbol) return false;
      if (themeSymbols && !r.themes?.includes(selectedTheme as string) && !themeSymbols.has(ticker)) return false;
      if (market !== 'all' && !MARKET_EXCHANGES[market]?.includes((r.exchange || '').toUpperCase())) return false;
      return matchesReport(r, query, suggestedTickers);
    });
    return list.sort((a, b) => {
      switch (sortType) {
        case 'returnDesc': return (b.returnRate ?? 0) - (a.returnRate ?? 0);
        case 'returnAsc': return (a.returnRate ?? 0) - (b.returnRate ?? 0);
        case 'popular': return (b.views ?? 0) - (a.views ?? 0);
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [reports, picked, themeSymbols, selectedTheme, market, query, suggestedTickers, sortType]);

  // 고른 종목 요약 — 리포트 수 · 의견 분포 · 평균 수익률
  const pickedSummary = useMemo(() => {
    if (!picked) return null;
    const rs = reports.filter((r) => (r.ticker || '').toUpperCase() === picked.symbol);
    const count = (o: string) => rs.filter((r) => r.opinion === o).length;
    const avg = rs.length ? rs.reduce((s, r) => s + (r.returnRate ?? 0), 0) / rs.length : null;
    return { total: rs.length, buy: count('buy'), sell: count('sell'), hold: count('hold'), avg };
  }, [picked, reports]);

  // 리포트가 많은 종목 — 검색 전 둘러보기
  const topStocks = useMemo(() => {
    const m = new Map<string, { ticker: string; name: string; exchange: string; n: number }>();
    for (const r of reports) {
      const t = (r.ticker || '').toUpperCase();
      if (!t) continue;
      const cur = m.get(t) ?? { ticker: t, name: shortStockName(r.stockName, t), exchange: r.exchange, n: 0 };
      cur.n++;
      m.set(t, cur);
    }
    return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 12);
  }, [reports]);

  const isFiltering = !!(query.trim() || picked || selectedTheme || market !== 'all');

  return (
    <Container>
      <div className="border-b-2 border-[var(--theme-border)] pb-3 mb-5">
        <p className="kicker">종목 · 리포트 검색</p>
        <h1 className="headline text-2xl sm:text-3xl font-bold">어떤 종목이 궁금하세요?</h1>
      </div>

      <SearchBar
        searchQuery={query}
        setSearchQuery={(v) => {
          setQuery(v);
          if (v) setPicked(null);
        }}
        placeholder="종목·티커·초성·제목·작성자 (예: 하닉, NVDA, ㅅㅅㅈㅈ)"
        showStockSuggestions
        onSelectStock={handlePick}
        onSuggestions={handleSuggestions}
        className="mb-5 sm:max-w-2xl"
      />

      {/* 고른 종목 요약 */}
      {picked && pickedSummary && (
        <section className="mb-6 border-y-2 border-[var(--theme-border)] py-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker">{exchangeLabel(picked.exchange)} · {picked.symbol}</p>
            <h2 className="headline text-2xl sm:text-3xl leading-tight">{picked.name}</h2>
          </div>
          <dl className="flex flex-wrap gap-6 text-sm tabular-nums">
            <div><dt className="text-xs text-[var(--theme-ink-soft)]">리포트</dt><dd className="font-black text-lg">{pickedSummary.total}편</dd></div>
            <div>
              <dt className="text-xs text-[var(--theme-ink-soft)]">의견</dt>
              <dd className="font-bold text-lg">
                <span className="text-[var(--color-up)]">매수 {pickedSummary.buy}</span>
                <span className="mx-1.5 text-[var(--theme-border-muted)]">/</span>
                <span className="text-[var(--color-down)]">매도 {pickedSummary.sell}</span>
                {pickedSummary.hold > 0 && <span className="ml-1.5 text-[var(--theme-ink-soft)]">/ 보유 {pickedSummary.hold}</span>}
              </dd>
            </div>
            {pickedSummary.avg !== null && (
              <div>
                <dt className="text-xs text-[var(--theme-ink-soft)]">평균 수익률</dt>
                <dd className={`font-black text-lg ${pickedSummary.avg > 0 ? 'text-[var(--color-up)]' : pickedSummary.avg < 0 ? 'text-[var(--color-down)]' : ''}`}>
                  {pickedSummary.avg > 0 ? '+' : ''}{pickedSummary.avg.toFixed(2)}%
                </dd>
              </div>
            )}
          </dl>
          <button type="button" onClick={() => setPicked(null)} className="text-sm font-bold underline underline-offset-4">
            종목 선택 해제 ✕
          </button>
        </section>
      )}

      {/* 검색 전 — 리포트가 많은 종목 */}
      {!isFiltering && topStocks.length > 0 && (
        <section className="mb-6">
          <p className="text-xs font-bold text-[var(--theme-ink-soft)] mb-2">리포트가 많은 종목</p>
          <div className="flex flex-wrap gap-1.5">
            {topStocks.map((s) => (
              <button key={s.ticker} type="button" onClick={() => pickFromReports(s.ticker, s.name, s.exchange)} className={CHIP(false)}>
                <span className="font-bold">{s.name}</span>
                <span className="ml-1 text-[var(--theme-ink-soft)]">{s.n}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 필터 — 시장 · 정렬 · 테마 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-y-1 border-b border-[var(--theme-border-muted)]">
        <div className="flex overflow-x-auto scrollbar-hide">
          {(Object.keys(MARKET_LABELS) as MarketFilter[]).map((m) => (
            <button key={m} onClick={() => setMarket(m)} className={TAB(market === m)}>{MARKET_LABELS[m]}</button>
          ))}
        </div>
        <div className="flex overflow-x-auto scrollbar-hide">
          {(Object.keys(SORT_LABELS) as SortType[]).map((t) => (
            <button key={t} onClick={() => setSortType(t)} className={TAB(sortType === t)}>{SORT_LABELS[t]}</button>
          ))}
        </div>
      </div>
      {allThemes.length > 0 && (
        <div className="mb-4 flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <button onClick={() => setSelectedTheme(null)} className={CHIP(selectedTheme === null)}>모든 테마</button>
          {allThemes.map((t) => (
            <button key={t.id} onClick={() => setSelectedTheme(t.id === selectedTheme ? null : t.id)} className={CHIP(selectedTheme === t.id)} title={t.description}>
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* 결과 */}
      {loading ? (
        <InlineLoading label="리포트를 모으는 중" />
      ) : (
        <>
          <p className="text-xs text-[var(--theme-ink-soft)] mb-1">
            {isFiltering ? (
              <>
                {query.trim() && <>&lsquo;<span className="font-bold text-[var(--foreground)]">{query.trim()}</span>&rsquo; </>}
                리포트 <span className="font-bold text-[var(--foreground)]">{filtered.length}</span>편
              </>
            ) : (
              <>전체 리포트 {filtered.length}편</>
            )}
          </p>

          {filtered.length > 0 ? (
            <div className="border-t border-[var(--theme-border-muted)]">
              {filtered.slice(0, visible).map((r) => (
                <ReportCard key={r.id} {...(r as unknown as React.ComponentProps<typeof ReportCard>)} />
              ))}
            </div>
          ) : (
            <div className="py-14 text-center border-t border-[var(--theme-border-muted)]">
              <p className="headline text-lg">
                {picked ? `${picked.name} 리포트가 아직 없어요` : '맞는 리포트가 없어요'}
              </p>
              <p className="mt-1 text-sm text-[var(--theme-ink-soft)]">
                {picked ? '첫 리포트를 남기면 시장이 채점을 시작합니다.' : '다른 이름·티커로 찾거나 필터를 풀어 보세요.'}
              </p>
              {picked && (
                <Link href="/write" className="btn-primary inline-block mt-4 text-sm">리포트 쓰기 →</Link>
              )}
            </div>
          )}

          {filtered.length > visible && (
            <div className="text-center mt-6">
              <button type="button" onClick={() => setVisible((v) => v + PAGE)} className="btn-secondary text-sm">
                더 보기 ({filtered.length - visible}편 남음)
              </button>
            </div>
          )}
        </>
      )}
    </Container>
  );
}
