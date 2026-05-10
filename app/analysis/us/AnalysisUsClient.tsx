'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FinancialMetrics, AnalysisTab, ViewMode, TrendsResponse } from '../types';
import type { SecSearchResult } from '@/lib/secFinancials/types';
import { stockSearchIndex, type GlobalStock, type Stock } from '@/lib/stockSearchIndex';
import { PerformanceTab } from '../tabs/PerformanceTab';
import { ProfitabilityTab } from '../tabs/ProfitabilityTab';
import { StabilityTab } from '../tabs/StabilityTab';
import { CashFlowTab } from '../tabs/CashFlowTab';
import { InterestTab } from '../tabs/InterestTab';
import { MarketTabs } from '../components/MarketTabs';
import { fmtUSDPrice } from '../theme';
import { convertMetricsToKRW, type ExchangeRateInfo } from '@/lib/currencyConvert';

/**
 * 클라이언트 인메모리 인덱스 — 다른 페이지에서 이미 빌드됐으면 즉시 사용,
 * 아니면 첫 진입 시 한 번만 fetch + build.
 */
let globalStocksCache: GlobalStock[] | null = null;
let globalStocksLoadPromise: Promise<GlobalStock[]> | null = null;

async function ensureStockIndex(): Promise<void> {
  if (stockSearchIndex.ready) return;
  if (globalStocksCache) {
    stockSearchIndex.build(globalStocksCache);
    return;
  }
  if (!globalStocksLoadPromise) {
    globalStocksLoadPromise = fetch('/data/global-stocks.json')
      .then((r) => r.json())
      .then((d: { stocks: GlobalStock[] }) => {
        globalStocksCache = d.stocks;
        stockSearchIndex.build(d.stocks);
        return d.stocks;
      })
      .catch((err) => {
        globalStocksLoadPromise = null;
        throw err;
      });
  }
  await globalStocksLoadPromise;
}

/** Stock(인덱스 결과) → SecSearchResult 매핑. NAS/NYS만 통과. */
function toSecResult(s: Stock): SecSearchResult | null {
  if (s.exchange !== 'NAS' && s.exchange !== 'NYS') return null;
  return {
    ticker: s.symbol,
    nameEn: s.name,
    nameKr: s.nameKr || undefined,
    exchange: s.exchange as 'NAS' | 'NYS',
  };
}

/* ─── 기간 선택 ─── */

const YEAR_RANGES = [
  { key: '5Y', label: '5년', years: 5 },
  { key: '7Y', label: '7년', years: 7 },
  { key: '10Y', label: '10년', years: 10 },
  { key: 'MAX', label: '전체', years: 0 },
] as const;

type YearRangeKey = (typeof YEAR_RANGES)[number]['key'];

function buildYears(rangeKey: YearRangeKey, mode: ViewMode): string {
  const now = new Date().getFullYear();
  const r = YEAR_RANGES.find((r) => r.key === rangeKey)!;
  // 미국 회계연도 마감 직후 10-K 제출 전까지 갭이 있어 직전 연도까지로 안전하게.
  const endYear = mode === 'annual' ? now - 1 : now;
  const startYear = r.years === 0 ? 2010 : endYear - (r.years - 1);
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);
  return years.join(',');
}

const TABS: { key: AnalysisTab; label: string }[] = [
  { key: 'performance', label: '실적' },
  { key: 'profitability', label: '수익성' },
  { key: 'stability', label: '안정성' },
  { key: 'cashflow', label: '현금흐름' },
  { key: 'interest', label: '관심도' },
];

/** 기본 인기 미국주식 (한국인 친화) */
const DEFAULT_STOCKS: SecSearchResult[] = [
  { ticker: 'NVDA', nameEn: 'NVIDIA CORP', nameKr: '엔비디아', exchange: 'NAS' },
  { ticker: 'AAPL', nameEn: 'APPLE INC', nameKr: '애플', exchange: 'NAS' },
  { ticker: 'MSFT', nameEn: 'MICROSOFT CORP', nameKr: '마이크로소프트', exchange: 'NAS' },
  { ticker: 'TSLA', nameEn: 'TESLA INC', nameKr: '테슬라', exchange: 'NAS' },
  { ticker: 'GOOGL', nameEn: 'ALPHABET INC', nameKr: '알파벳', exchange: 'NAS' },
  { ticker: 'AMZN', nameEn: 'AMAZON COM INC', nameKr: '아마존', exchange: 'NAS' },
  { ticker: 'META', nameEn: 'META PLATFORMS INC', nameKr: '메타', exchange: 'NAS' },
  { ticker: 'BRK.B', nameEn: 'BERKSHIRE HATHAWAY INC', nameKr: '버크셔', exchange: 'NYS' },
];

interface UsCompanyInfo {
  ticker: string;
  cik: string;
  entityName: string;
  exchange: 'NAS' | 'NYS';
  nameKr?: string;
}

interface UsStockProfile {
  currentPrice: number;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  high52w: number | null;
  low52w: number | null;
  volume: number;
}

/* ════════════════════════════════════════════ */

export default function AnalysisUsClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SecSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [indexReady, setIndexReady] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const [popularStocks, setPopularStocks] = useState<SecSearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [selectedStock, setSelectedStock] = useState<SecSearchResult | null>(null);
  const [companyInfo, setCompanyInfo] = useState<UsCompanyInfo | null>(null);
  const [stockProfile, setStockProfile] = useState<UsStockProfile | null>(null);
  const [financialData, setFinancialData] = useState<FinancialMetrics[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>('annual');
  const [yearRange, setYearRange] = useState<YearRangeKey>('5Y');
  const [activeTab, setActiveTab] = useState<AnalysisTab>('performance');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 관심도
  const [trendPeriod, setTrendPeriod] = useState<string>('12m');
  const [trendsData, setTrendsData] = useState<TrendsResponse | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);

  // 통화 (USD = SEC 원본 / KRW = 환율 변환)
  const [currency, setCurrency] = useState<'USD' | 'KRW'>('USD');
  const [exchangeRate, setExchangeRate] = useState<ExchangeRateInfo | null>(null);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  /* 인기 종목 + 초기 선택 + 인덱스 빌드 */
  useEffect(() => {
    fetch('/api/sec/search?mode=popular')
      .then((r) => r.json())
      .then((d) => {
        if (d.results?.length > 0) setPopularStocks(d.results);
      })
      .catch(() => {});
    setSelectedStock(DEFAULT_STOCKS[0]);

    // 클라이언트 인덱스 준비 (다른 페이지에서 빌드됐으면 즉시)
    ensureStockIndex()
      .then(() => setIndexReady(true))
      .catch((e) => console.error('[us-analysis] index load failed', e));
  }, []);

  /* 검색 — 클라이언트 인덱스 (50ms debounce, 네트워크 없음) */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSelectedSearchIndex(-1);
      return;
    }
    clearTimeout(searchTimerRef.current);
    const debounceMs = indexReady ? 50 : 150;
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        if (!indexReady) {
          await ensureStockIndex();
          setIndexReady(true);
        }
        // 인덱스에서 50개 받아서 NAS/NYS만 필터링 → 상위 15개
        const raw = stockSearchIndex.search(searchQuery, 50);
        const filtered = raw
          .map(toSecResult)
          .filter((r): r is SecSearchResult => r !== null)
          .slice(0, 15);
        setSearchResults(filtered);
        setSelectedSearchIndex(-1);
      } catch (e) {
        console.error(e);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, debounceMs);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery, indexReady]);

  /* 검색창 외부 클릭 닫기 */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* 재무 + 가격 프로필 fetch */
  useEffect(() => {
    if (!selectedStock) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const years = buildYears(yearRange, viewMode);
      try {
        const [fin, profile] = await Promise.allSettled([
          fetch(
            `/api/sec/financial?ticker=${selectedStock!.ticker}&mode=${viewMode}&years=${years}`,
          ).then(async (r) => (r.ok ? r.json() : null)),
          fetch(
            `/api/stocks/profile?symbol=${selectedStock!.ticker}&exchange=${selectedStock!.exchange}`,
          ).then(async (r) => (r.ok ? r.json() : null)),
        ]);
        if (cancelled) return;

        if (fin.status === 'fulfilled' && fin.value) {
          const finData = fin.value as { ticker: string; cik: string; entityName: string; metrics: FinancialMetrics[] };
          setFinancialData(finData.metrics || []);
          setCompanyInfo({
            ticker: selectedStock!.ticker,
            cik: finData.cik,
            entityName: finData.entityName,
            exchange: selectedStock!.exchange,
            nameKr: selectedStock!.nameKr,
          });
        } else {
          setFinancialData([]);
          setCompanyInfo(null);
          setError('SEC 재무 데이터를 불러올 수 없습니다');
        }

        if (profile.status === 'fulfilled' && profile.value?.profile) {
          const p = profile.value.profile;
          setStockProfile({
            currentPrice: p.currentPrice ?? 0,
            per: p.per ?? null,
            pbr: p.pbr ?? null,
            eps: p.eps ?? null,
            high52w: p.high52w ?? null,
            low52w: p.low52w ?? null,
            volume: p.volume ?? 0,
          });
        } else {
          setStockProfile(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedStock, viewMode, yearRange]);

  /* 관심도 탭 데이터 */
  useEffect(() => {
    if (activeTab !== 'interest' || !companyInfo) return;
    let cancelled = false;
    async function loadTrends() {
      setTrendsLoading(true);
      try {
        const keywordEn = companyInfo!.entityName.replace(/\s*(CO\b|LTD\b|INC\b|CORP\b|,|\.)+/gi, '').trim();
        const keyword = companyInfo!.nameKr || keywordEn;
        const res = await fetch(
          `/api/trends?keyword=${encodeURIComponent(keyword)}&keyword_en=${encodeURIComponent(keywordEn)}&period=${trendPeriod}`,
        );
        if (!res.ok) throw new Error('Trends fetch failed');
        const data: TrendsResponse = await res.json();
        if (!cancelled) setTrendsData(data);
      } catch {
        if (!cancelled) setTrendsData(null);
      } finally {
        if (!cancelled) setTrendsLoading(false);
      }
    }
    loadTrends();
    return () => {
      cancelled = true;
    };
  }, [activeTab, companyInfo, trendPeriod]);

  const selectStock = useCallback((stock: SecSearchResult) => {
    setSelectedStock(stock);
    setSearchQuery('');
    setSearchOpen(false);
    setSelectedSearchIndex(-1);
  }, []);

  /* 키보드 네비게이션: ↑↓ 이동 / Enter 선택 / Esc 닫기 */
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!searchOpen || searchResults.length === 0) {
        if (e.key === 'Escape') setSearchOpen(false);
        return;
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSearchIndex((p) => (p < searchResults.length - 1 ? p + 1 : p));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSearchIndex((p) => (p > 0 ? p - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedSearchIndex >= 0) selectStock(searchResults[selectedSearchIndex]);
          else if (searchResults.length > 0) selectStock(searchResults[0]);
          break;
        case 'Escape':
          setSearchOpen(false);
          break;
      }
    },
    [searchOpen, searchResults, selectedSearchIndex, selectStock],
  );

  const displayStocks = useMemo(
    () => (popularStocks.length > 0 ? popularStocks.slice(0, 8) : DEFAULT_STOCKS),
    [popularStocks],
  );

  const displayName = useMemo(() => {
    if (!companyInfo) return '';
    return companyInfo.nameKr || companyInfo.entityName;
  }, [companyInfo]);

  /* ─── 통화 토글 ─── */

  // KRW 모드일 땐 데이터를 환율로 변환해서 차트에 전달
  const displayedFinancialData = useMemo(() => {
    if (currency === 'KRW' && exchangeRate?.rate) {
      return convertMetricsToKRW(financialData, exchangeRate.rate);
    }
    return financialData;
  }, [financialData, currency, exchangeRate]);

  const openRateModal = useCallback(async () => {
    if (currency === 'KRW') {
      // 이미 KRW면 바로 USD로 복귀
      setCurrency('USD');
      return;
    }
    setRateModalOpen(true);
    setRateError(null);
    if (!exchangeRate || Date.now() - new Date(exchangeRate.fetchedAt).getTime() > 60 * 60 * 1000) {
      setRateLoading(true);
      try {
        const res = await fetch('/api/exchange-rate');
        if (!res.ok) throw new Error('환율 조회 실패');
        const data: ExchangeRateInfo = await res.json();
        setExchangeRate(data);
      } catch (e) {
        setRateError(e instanceof Error ? e.message : '환율을 가져올 수 없습니다');
      } finally {
        setRateLoading(false);
      }
    }
  }, [currency, exchangeRate]);

  const applyKRW = useCallback(() => {
    setCurrency('KRW');
    setRateModalOpen(false);
  }, []);

  /* ═══ 렌더 ═══ */

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* 페이지 타이틀 (모바일 + 데스크탑 공통, 사이드바 위) */}
      <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight mb-4 sm:mb-6 text-[var(--foreground)]">
        기업분석
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 lg:gap-7">
        {/* ─────────── 사이드바 (좌) ─────────── */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-3 lg:pb-3">
          {/* 시장 토글 */}
          <MarketTabs active="us" variant="block" />

          {/* 검색 + 인기 종목 */}
          <div ref={searchRef} className="flex flex-col gap-4">
            {/* 검색 입력 + 드롭다운 (한 묶음) */}
            <div className="relative">
              <p className="font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-2">
                검색
              </p>
              <div
                className={`flex rounded-xl overflow-hidden transition-all border-2 ${
                  searchOpen
                    ? 'border-[var(--theme-accent)]'
                    : 'border-[#94a3b8] dark:border-[#64748b]'
                }`}
                style={{
                  boxShadow: searchOpen
                    ? 'inset 1px 1px 0 0 rgba(255, 255, 255, 0.75), 2px 2px 0 0 rgba(59, 80, 181, 0.55), 4px 4px 0 0 rgba(59, 80, 181, 0.40), 6px 6px 0 0 rgba(59, 80, 181, 0.25)'
                    : 'inset 1px 1px 0 0 rgba(255, 255, 255, 0.75), 2px 2px 0 0 rgba(59, 80, 181, 0.30), 4px 4px 0 0 rgba(59, 80, 181, 0.20), 6px 6px 0 0 rgba(59, 80, 181, 0.12)',
                }}
              >
                <div className="flex-shrink-0 flex items-center justify-center w-11 bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-dark)]">
                  <svg className="w-[18px] h-[18px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="엔비디아, NVDA…"
                  aria-label="미국주식 검색"
                  aria-autocomplete="list"
                  aria-expanded={searchOpen && searchResults.length > 0}
                  className="flex-1 px-3 py-3 font-heading text-sm font-bold bg-[var(--theme-bg-card)] text-[var(--foreground)] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none min-w-0"
                />
                {searchLoading && (
                  <div className="flex-shrink-0 flex items-center justify-center w-9">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--theme-accent)]/30 border-t-[var(--theme-accent)]" />
                  </div>
                )}
                {searchQuery && !searchLoading && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setSelectedSearchIndex(-1);
                    }}
                    className="flex-shrink-0 flex items-center justify-center w-9 text-gray-400 hover:text-[var(--foreground)] transition-colors"
                    aria-label="지우기"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* 검색 드롭다운 — 결과 있음 */}
              {searchOpen && searchResults.length > 0 && (
          <div
            role="listbox"
            className="absolute z-50 left-0 right-0 top-full mt-2 bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border-muted)] rounded-xl max-h-[360px] overflow-y-auto"
            style={{ boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.08)' }}
          >
            {searchResults.map((r, idx) => {
              const isFocused = idx === selectedSearchIndex;
              return (
                <button
                  key={`${r.ticker}-${r.exchange}`}
                  role="option"
                  aria-selected={isFocused}
                  onMouseEnter={() => setSelectedSearchIndex(idx)}
                  onClick={() => selectStock(r)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 transition-colors border-b border-[var(--theme-border-muted)]/40 last:border-b-0 ${
                    isFocused
                      ? 'bg-[var(--theme-accent)]/10'
                      : 'hover:bg-[var(--theme-accent)]/8'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-heading text-sm font-bold text-[var(--foreground)] truncate">
                      {r.nameKr || r.nameEn}
                    </span>
                    {r.nameKr && (
                      <span className="font-sans text-[11px] text-gray-400 truncate">· {r.nameEn}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-heading text-xs font-bold text-gray-400 tabular-nums">{r.ticker}</span>
                    <span className="font-heading text-[9px] font-bold uppercase text-gray-300 dark:text-gray-600">
                      {r.exchange}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

              {/* 검색 드롭다운 — 결과 없음 */}
              {searchOpen && !searchLoading && searchQuery.trim().length > 0 && searchResults.length === 0 && (
                <div
                  className="absolute z-50 left-0 right-0 top-full mt-2 bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border-muted)] rounded-xl px-4 py-5"
                  style={{ boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)' }}
                >
                  <p className="font-sans text-sm text-gray-500 dark:text-gray-400 text-center">
                    검색 결과가 없습니다
                  </p>
                  <p className="font-sans text-[11px] text-gray-400 dark:text-gray-500 text-center mt-1">
                    티커, 영문, 한글 어느 쪽이든
                  </p>
                </div>
              )}
            </div>

            {/* 인기 종목 — 사이드바 세로 리스트 */}
            <div>
              <p className="font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-2">
                인기 종목
              </p>
              <div className="flex flex-col gap-1">
                {displayStocks.map((stock) => (
                  <button
                    key={stock.ticker}
                    onClick={() => selectStock(stock)}
                    className={`flex items-center justify-between gap-2 font-heading text-sm px-3 py-2 font-bold rounded-lg transition-colors ${
                      selectedStock?.ticker === stock.ticker
                        ? 'bg-[var(--theme-accent)] text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-[var(--foreground)] hover:bg-[var(--theme-accent)]/8'
                    }`}
                  >
                    <span className="truncate">{stock.nameKr || stock.ticker}</span>
                    <span
                      className={`font-sans text-[10px] font-bold tracking-wider tabular-nums flex-shrink-0 ${
                        selectedStock?.ticker === stock.ticker
                          ? 'text-white/80'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {stock.ticker}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ─────────── 메인 (우) ─────────── */}
        <main className="min-w-0">
          {/* 기업 헤더 */}
          {companyInfo && !loading && (
        <div
          className="mb-5 sm:mb-7 relative overflow-hidden rounded-2xl border border-[var(--theme-border-muted)] bg-gradient-to-br from-[var(--theme-bg-card)] to-[var(--theme-bg)] p-5 sm:p-7"
          style={{ boxShadow: 'var(--shadow-md)' }}
        >
          <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-2xl sm:text-[34px] font-black text-[var(--foreground)] leading-none tracking-tight truncate">
                {displayName}
              </h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="font-heading text-sm font-bold text-gray-400 dark:text-gray-500 tabular-nums">
                  {companyInfo.ticker}
                </span>
                <span className="inline-flex items-center font-heading text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {companyInfo.exchange === 'NAS' ? 'NASDAQ' : 'NYSE'}
                </span>
                {companyInfo.nameKr && companyInfo.entityName && (
                  <span className="font-sans text-xs text-gray-400 dark:text-gray-500 truncate">
                    {companyInfo.entityName}
                  </span>
                )}
              </div>
            </div>

            {stockProfile && stockProfile.currentPrice > 0 && (
              <div className="text-right flex-shrink-0">
                <p className="font-heading text-2xl sm:text-[34px] font-black text-[var(--foreground)] leading-none tabular-nums">
                  {fmtUSDPrice(stockProfile.currentPrice)}
                </p>
                <div className="flex items-center justify-end gap-3 sm:gap-4 mt-2 flex-wrap">
                  {stockProfile.per !== null && (
                    <span className="font-heading text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                      PER <b className="text-[var(--foreground)] tabular-nums ml-0.5">{stockProfile.per.toFixed(1)}</b>
                    </span>
                  )}
                  {stockProfile.pbr !== null && (
                    <span className="font-heading text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                      PBR <b className="text-[var(--foreground)] tabular-nums ml-0.5">{stockProfile.pbr.toFixed(2)}</b>
                    </span>
                  )}
                  {stockProfile.eps !== null && (
                    <span className="font-heading text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                      EPS <b className="text-[var(--foreground)] tabular-nums ml-0.5">${stockProfile.eps.toFixed(2)}</b>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border-l-4 border-l-[var(--theme-accent)] border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)] p-3 mb-4">
          <p className="font-heading text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* 탭 + 필터 */}
      {selectedStock && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-6 border-b border-[var(--theme-border-muted)]">
          <div className="flex overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                disabled={loading}
                className={`font-heading text-sm sm:text-[15px] px-3 sm:px-5 py-3 font-bold tracking-tight transition-all relative ${
                  activeTab === tab.key
                    ? 'text-[var(--theme-accent)] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-[var(--theme-accent)]'
                    : 'text-gray-400 dark:text-gray-500 hover:text-[var(--foreground)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap pb-2 sm:pb-0">
            {/* 통화 토글 (USD ↔ KRW) */}
            <button
              type="button"
              onClick={openRateModal}
              disabled={loading}
              className={`flex items-center gap-1 font-heading text-xs px-3 py-1.5 font-bold border rounded-lg transition-all ${
                currency === 'KRW'
                  ? 'bg-[var(--theme-accent)] text-white border-[var(--theme-accent)]'
                  : 'bg-[var(--theme-bg-card)] text-gray-500 dark:text-gray-400 border-[var(--theme-border-muted)] hover:border-[var(--theme-accent)] hover:text-[var(--theme-accent)]'
              }`}
              aria-label={currency === 'USD' ? 'KRW로 환전' : 'USD로 복귀'}
            >
              <span>{currency === 'USD' ? '$ USD' : '₩ KRW'}</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m4 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>

            <div className="flex border border-[var(--theme-border-muted)] rounded-lg overflow-hidden">
              {YEAR_RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setYearRange(r.key)}
                  disabled={loading}
                  className={`font-heading text-xs px-3 py-1.5 font-bold transition-all ${
                    yearRange === r.key
                      ? 'bg-[var(--theme-accent)] text-white'
                      : 'text-gray-400 hover:text-[var(--foreground)] bg-[var(--theme-bg-card)]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex border border-[var(--theme-border-muted)] rounded-lg overflow-hidden">
              {(['annual', 'quarterly'] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  disabled={loading}
                  className={`font-heading text-xs px-3 py-1.5 font-bold transition-all ${
                    viewMode === m
                      ? 'bg-[var(--theme-accent)] text-white'
                      : 'text-gray-400 hover:text-[var(--foreground)] bg-[var(--theme-bg-card)]'
                  }`}
                >
                  {m === 'annual' ? '연간' : '분기'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 본문 */}
      {!selectedStock ? (
        <div className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)] py-12 px-4 text-center">
          <svg
            className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="font-sans text-sm mb-2 text-[var(--foreground)]">기업을 선택하세요</p>
          <p className="font-sans text-xs text-gray-500">미국 상장사를 한글/티커/영문 어느 쪽으로든 검색</p>
        </div>
      ) : loading ? (
        <div className="space-y-4 sm:space-y-5">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)] p-5">
              <div className="animate-pulse">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 w-28 mb-4 rounded" />
                <div className="h-[260px] bg-gray-100 dark:bg-gray-800/40 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : financialData.length === 0 ? (
        <div className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)] py-12 px-4 text-center">
          <p className="font-sans text-sm mb-2 text-[var(--foreground)]">재무 데이터가 없습니다</p>
          <p className="font-sans text-xs text-gray-500">SEC EDGAR에 해당 기간 XBRL 공시가 없을 수 있습니다</p>
        </div>
      ) : (
        <>
          {activeTab === 'performance' && <PerformanceTab data={displayedFinancialData} currency={currency} />}
          {activeTab === 'profitability' && <ProfitabilityTab data={displayedFinancialData} />}
          {activeTab === 'stability' && <StabilityTab data={displayedFinancialData} currency={currency} />}
          {activeTab === 'cashflow' && <CashFlowTab data={displayedFinancialData} currency={currency} />}
          {activeTab === 'interest' && (
            <InterestTab
              data={trendsData}
              loading={trendsLoading}
              period={trendPeriod}
              setPeriod={setTrendPeriod}
              companyName={displayName}
            />
          )}
        </>
      )}

          {/* 출처 */}
          <p className="font-sans text-[10px] text-gray-400 dark:text-gray-600 mt-10 tracking-wide text-center">
            SEC EDGAR · XBRL Financial Data · 연결재무제표 ·{' '}
            {currency === 'KRW' && exchangeRate
              ? `단위: 억원 (1 USD = ₩${exchangeRate.rate.toFixed(2)} · ${exchangeRate.date} 기준)`
              : '단위: 백만 USD'}
          </p>
        </main>
      </div>

      {/* 환율 모달 */}
      {rateModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ background: 'rgba(15, 23, 42, 0.5)' }}
          onClick={() => setRateModalOpen(false)}
        >
          <div
            className="bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border-muted)] rounded-2xl p-6 sm:p-7 max-w-sm w-full"
            style={{ boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading text-lg sm:text-xl font-bold text-[var(--foreground)] mb-1">
              원화로 환전
            </h3>
            <p className="font-sans text-xs text-gray-500 dark:text-gray-400 mb-5">
              모든 차트와 숫자가 현재 환율로 변환됩니다
            </p>

            {rateLoading ? (
              <div className="py-6 flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-[var(--theme-accent)]/30 border-t-[var(--theme-accent)]" />
                <p className="font-sans text-xs text-gray-500">환율 조회 중...</p>
              </div>
            ) : rateError ? (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 mb-4">
                <p className="font-heading text-xs font-bold text-red-600 dark:text-red-400">{rateError}</p>
              </div>
            ) : exchangeRate ? (
              <>
                <div className="rounded-xl border-2 border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4 mb-4">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-heading text-xs font-bold text-gray-500 dark:text-gray-400">1 USD =</span>
                    <span className="font-heading text-2xl font-black text-[var(--theme-accent)] tabular-nums">
                      ₩{exchangeRate.rate.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-sans text-[11px] text-gray-400 dark:text-gray-500">
                    <span>{exchangeRate.date} 기준</span>
                    <span className="uppercase tracking-wider">
                      {exchangeRate.source === 'frankfurter' ? 'ECB · Frankfurter' : 'Naver 금융'}
                    </span>
                  </div>
                </div>
                <p className="font-sans text-[11px] text-gray-500 dark:text-gray-400 mb-4">
                  매출·영업이익·자산 등 모든 절대값이 환율로 환전됩니다.
                  비율 지표(영업이익률, ROE, 부채비율)는 그대로 유지.
                </p>
              </>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRateModalOpen(false)}
                className="flex-1 font-heading text-sm py-2.5 font-bold border-2 border-[var(--theme-border-muted)] rounded-lg text-gray-500 dark:text-gray-400 hover:border-[var(--theme-accent)] hover:text-[var(--theme-accent)] transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={applyKRW}
                disabled={!exchangeRate || rateLoading || !!rateError}
                className="flex-1 font-heading text-sm py-2.5 font-bold rounded-lg bg-[var(--theme-accent)] text-white hover:bg-[var(--theme-accent-dark)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                적용하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
