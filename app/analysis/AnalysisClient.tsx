'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  DartCompanyInfo,
  FinancialMetrics,
  DartFinancialResponse,
  StockProfile,
  SearchResult,
  ViewMode,
  AnalysisTab,
  TrendsResponse,
} from './types';
import { CompanyHeader } from './components/CompanyHeader';
import { MarketTabs } from './components/MarketTabs';
import { PerformanceTab } from './tabs/PerformanceTab';
import { ProfitabilityTab } from './tabs/ProfitabilityTab';
import { StabilityTab } from './tabs/StabilityTab';
import { CashFlowTab } from './tabs/CashFlowTab';
import { InterestTab } from './tabs/InterestTab';

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
  // 연간 모드는 현재 연도 사업보고서가 아직 미제출일 수 있어 직전 연도까지만
  const endYear = mode === 'annual' ? now - 1 : now;
  const startYear = r.years === 0 ? 2015 : endYear - (r.years - 1);
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

/* ═══════════════════════════════════════════ */
/*                메인 컴포넌트                 */
/* ═══════════════════════════════════════════ */

export default function AnalysisClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [popularCompanies, setPopularCompanies] = useState<SearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [selectedCorp, setSelectedCorp] = useState<SearchResult | null>(null);
  const [companyInfo, setCompanyInfo] = useState<DartCompanyInfo | null>(null);
  const [stockProfile, setStockProfile] = useState<StockProfile | null>(null);
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

  // 한국인 거래량/검색량 상위 8종목 (산업 분산)
  const defaultCompanies: SearchResult[] = useMemo(
    () => [
      { corpCode: '00126380', corpName: '삼성전자', stockCode: '005930' },
      { corpCode: '00164779', corpName: 'SK하이닉스', stockCode: '000660' },
      { corpCode: '00164742', corpName: '현대차', stockCode: '005380' },
      { corpCode: '01515323', corpName: 'LG에너지솔루션', stockCode: '373220' },
      { corpCode: '00126566', corpName: '한화에어로스페이스', stockCode: '012450' },
      { corpCode: '00159616', corpName: '두산에너빌리티', stockCode: '034020' },
      { corpCode: '00877059', corpName: '삼성바이오로직스', stockCode: '207940' },
      { corpCode: '00258801', corpName: '카카오', stockCode: '035720' },
    ],
    []
  );

  useEffect(() => {
    fetch('/api/dart/search?mode=popular')
      .then((r) => r.json())
      .then((d) => {
        if (d.results?.length > 0) setPopularCompanies(d.results);
      })
      .catch(() => {});
    setSelectedCorp(defaultCompanies[0]);
  }, [defaultCompanies]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dart/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!selectedCorp) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const years = buildYears(yearRange, viewMode);
      try {
        const [info, fin, profile] = await Promise.allSettled([
          fetch(`/api/dart/company?corp_code=${selectedCorp!.corpCode}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`/api/dart/financial?corp_code=${selectedCorp!.corpCode}&mode=${viewMode}&years=${years}`).then((r) =>
            r.ok ? (r.json() as Promise<DartFinancialResponse>) : null
          ),
          fetch(`/api/kis/profile?stock_code=${selectedCorp!.stockCode}`).then((r) => (r.ok ? r.json() : null)),
        ]);
        if (cancelled) return;
        setCompanyInfo(info.status === 'fulfilled' ? info.value : null);
        setFinancialData(fin.status === 'fulfilled' && fin.value ? fin.value.metrics : []);
        setStockProfile(profile.status === 'fulfilled' ? profile.value : null);
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
  }, [selectedCorp, viewMode, yearRange]);

  // 관심도 탭 데이터
  useEffect(() => {
    if (activeTab !== 'interest' || !companyInfo) return;
    let cancelled = false;

    async function loadTrends() {
      setTrendsLoading(true);
      try {
        const keyword = companyInfo!.corp_name.replace(/\(주\)|\(사\)/g, '').trim();
        const engRaw = companyInfo!.corp_name_eng || '';
        const keywordEn = engRaw.replace(/\s*(CO\b|LTD\b|INC\b|CORP\b|,|\.)+/gi, '').trim() || keyword;
        const res = await fetch(
          `/api/trends?keyword=${encodeURIComponent(keyword)}&keyword_en=${encodeURIComponent(keywordEn)}&period=${trendPeriod}`
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

  const selectCompany = useCallback((company: SearchResult) => {
    setSelectedCorp(company);
    setSearchQuery('');
    setSearchOpen(false);
  }, []);

  const displayCompanies = useMemo(
    () => (popularCompanies.length > 0 ? popularCompanies.slice(0, 8) : defaultCompanies),
    [popularCompanies, defaultCompanies]
  );

  const cleanCompanyName = useMemo(
    () => companyInfo?.corp_name?.replace(/\(주\)|\(사\)/g, '').trim() || '',
    [companyInfo]
  );

  /* ═══ 렌더링 ═══ */

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* 페이지 타이틀 */}
      <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight mb-4 sm:mb-6 text-[var(--foreground)]">
        기업분석
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 lg:gap-7">
        {/* ─────────── 사이드바 (좌) ─────────── */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-3 lg:pb-3">
          {/* 시장 토글 */}
          <MarketTabs active="kr" variant="block" />

          {/* 검색 + 인기 종목 */}
          <div ref={searchRef} className="flex flex-col gap-4">
            {/* 검색 입력 + 드롭다운 */}
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
                  placeholder="삼성전자, 005930…"
                  className="flex-1 px-3 py-3 font-heading text-sm font-bold bg-[var(--theme-bg-card)] text-[var(--foreground)] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none min-w-0"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
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

              {/* 검색 드롭다운 */}
              {searchOpen && searchResults.length > 0 && (
                <div
                  className="absolute z-50 left-0 right-0 top-full mt-2 bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border-muted)] rounded-xl max-h-[360px] overflow-y-auto"
                  style={{ boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)' }}
                >
                  {searchResults.map((r) => (
                    <button
                      key={r.corpCode}
                      onClick={() => selectCompany(r)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--theme-accent)]/8 transition-colors border-b border-[var(--theme-border-muted)]/40 last:border-b-0"
                    >
                      <span className="font-heading text-sm font-bold text-[var(--foreground)] truncate">{r.corpName}</span>
                      <span className="font-heading text-xs font-bold text-gray-400 tabular-nums flex-shrink-0">{r.stockCode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 인기 종목 — 사이드바 세로 리스트 */}
            <div>
              <p className="font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-2">
                인기 종목
              </p>
              <div className="flex flex-col gap-1">
                {displayCompanies.map((company) => (
                  <button
                    key={company.corpCode}
                    onClick={() => selectCompany(company)}
                    className={`flex items-center justify-between gap-2 font-heading text-sm px-3 py-2 font-bold rounded-lg transition-colors ${
                      selectedCorp?.corpCode === company.corpCode
                        ? 'bg-[var(--theme-accent)] text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-[var(--foreground)] hover:bg-[var(--theme-accent)]/8'
                    }`}
                  >
                    <span className="truncate">{company.corpName}</span>
                    <span
                      className={`font-sans text-[10px] font-bold tracking-wider tabular-nums flex-shrink-0 ${
                        selectedCorp?.corpCode === company.corpCode
                          ? 'text-white/80'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {company.stockCode}
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
        <div className="mb-5 sm:mb-7">
          <CompanyHeader
            companyName={cleanCompanyName || companyInfo.corp_name}
            companyInfo={companyInfo}
            stockProfile={stockProfile}
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl border-l-4 border-l-[var(--theme-accent)] border border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)] p-3 mb-4">
          <p className="font-heading text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* 탭 + 필터 */}
      {selectedCorp && (
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
      {!selectedCorp ? (
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
          <p className="font-sans text-xs text-gray-500">상장된 모든 기업의 재무제표를 분석할 수 있습니다</p>
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
          <p className="font-sans text-xs text-gray-500">해당 기간의 DART 공시가 존재하지 않을 수 있습니다</p>
        </div>
      ) : (
        <>
          {activeTab === 'performance' && <PerformanceTab data={financialData} />}
          {activeTab === 'profitability' && <ProfitabilityTab data={financialData} />}
          {activeTab === 'stability' && <StabilityTab data={financialData} />}
          {activeTab === 'cashflow' && <CashFlowTab data={financialData} />}
          {activeTab === 'interest' && (
            <InterestTab
              data={trendsData}
              loading={trendsLoading}
              period={trendPeriod}
              setPeriod={setTrendPeriod}
              companyName={cleanCompanyName}
            />
          )}
        </>
      )}

          {/* 출처 */}
          <p className="font-sans text-[10px] text-gray-400 dark:text-gray-600 mt-10 tracking-wide text-center">
            DART Open API · 한국투자증권 · 연결재무제표(CFS) · 단위: 억원
          </p>
        </main>
      </div>
    </div>
  );
}
