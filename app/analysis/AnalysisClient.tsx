'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import type {
  DartCompanyInfo,
  FinancialMetrics,
  DartFinancialResponse,
  StockProfile,
  SearchResult,
  ViewMode,
  AnalysisTab,
  TrendPoint,
  TrendsResponse,
} from './types';

/* ─── 기간 선택 ─── */

const YEAR_RANGES = [
  { key: '5Y', label: '5년', years: 5 },
  { key: '7Y', label: '7년', years: 7 },
  { key: '10Y', label: '10년', years: 10 },
  { key: 'MAX', label: '전체', years: 0 },
] as const;

type YearRangeKey = typeof YEAR_RANGES[number]['key'];

function buildYears(rangeKey: YearRangeKey): string {
  const now = new Date().getFullYear();
  const r = YEAR_RANGES.find(r => r.key === rangeKey)!;
  const startYear = r.years === 0 ? 2015 : now - (r.years - 1);
  const years: number[] = [];
  for (let y = startYear; y <= now; y++) years.push(y);
  return years.join(',');
}

/* ─── 탭 ─── */

const TABS: { key: AnalysisTab; label: string }[] = [
  { key: 'performance', label: '실적' },
  { key: 'profitability', label: '수익성' },
  { key: 'stability', label: '안정성' },
  { key: 'cashflow', label: '현금흐름' },
  { key: 'interest', label: '관심도' },
];

const TREND_PERIODS = [
  { key: '3m', label: '3개월' },
  { key: '12m', label: '1년' },
  { key: '5y', label: '5년' },
] as const;

/* ─── 색상 ─── */

const C = {
  revenue: '#3b82f6',
  operatingProfit: '#10b981',
  netIncome: '#f59e0b',
  operatingMargin: '#e94560',
  netMargin: '#8b5cf6',
  roe: '#3b82f6',
  roa: '#10b981',
  debtRatio: '#f97316',
  currentRatio: '#06b6d4',
  positive: '#10b981',
  negative: '#ef4444',
  operatingCF: '#3b82f6',
  investingCF: '#f97316',
  financingCF: '#8b5cf6',
  fcf: '#10b981',
  capex: '#ec4899',
  grid: 'rgba(148,163,184,0.08)',
  accent: '#6366f1',
};

/* ─── 포맷 ─── */

function fmtB(v: number | null): string {
  if (v === null) return '-';
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}조`;
  return `${v.toLocaleString()}억`;
}

function fmtPct(v: number | null, showSign = false): string {
  if (v === null) return '-';
  const sign = showSign && v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function fmtPrice(v: number): string {
  return v.toLocaleString() + '원';
}

function fmtYB(v: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(0)}조`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}천억`;
  return `${v}억`;
}

function fmtX(v: number | null): string {
  if (v === null) return '-';
  return `${v.toFixed(1)}x`;
}

/* ─── 툴팁 ─── */

function ChartTooltip({ active, payload, label, fmt }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  fmt?: (n: string, v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] rounded-xl px-3.5 py-2.5 shadow-md">
      <p className="font-heading text-[11px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 tracking-widest uppercase">{label}</p>
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2 min-w-[140px]">
          <span className="w-2 h-2 flex-shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="font-heading text-xs text-gray-400">{e.name}</span>
          <span className="font-heading text-xs font-black ml-auto tabular-nums" style={{ color: e.color }}>
            {fmt ? fmt(e.name, e.value) : e.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── 차트 공통 ─── */

const AX = { fontSize: 12, fontWeight: 700, fill: 'var(--foreground)' };
const GRID = { strokeDasharray: '2 4' as const, stroke: C.grid, vertical: false };
const LEG = { fontSize: 12, fontWeight: 700, paddingTop: 6 };

/* ─── 현금흐름 패턴 ─── */

function diagnoseCF(m: FinancialMetrics): { code: string; name: string; desc: string; color: string } {
  const o = m.operatingCashFlow, i = m.investingCashFlow, f = m.financingCashFlow;
  if (o === null || i === null || f === null) return { code: '?', name: '데이터 부족', desc: '', color: '#94a3b8' };
  if (o > 0 && i < 0 && f < 0) return { code: 'A', name: '우량 성숙기업', desc: '영업으로 투자 + 부채상환', color: C.positive };
  if (o > 0 && i < 0 && f > 0) return { code: 'B', name: '고성장 투자', desc: '차입 포함 공격적 투자', color: C.revenue };
  if (o > 0 && i > 0 && f < 0) return { code: 'C', name: '구조조정', desc: '자산매각으로 부채상환', color: C.debtRatio };
  if (o < 0 && i < 0 && f > 0) return { code: 'E', name: '적자 투자', desc: '차입으로 적자 보전', color: C.negative };
  if (o < 0 && i > 0 && f > 0) return { code: 'F', name: '위기', desc: '매각+차입으로 적자 보전', color: C.negative };
  if (o < 0 && i > 0 && f < 0) return { code: 'G', name: '철수', desc: '자산매각으로 부채상환', color: C.negative };
  return { code: '-', name: '기타', desc: '', color: '#94a3b8' };
}

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

  // 프로필용 트렌드 요약 (4주 vs 4주) + 1년 차트 데이터
  const [trendSummary, setTrendSummary] = useState<{
    naver: { change: number; current: number; prev: number; trend: 'up' | 'down' | 'flat'; chart: { date: string; value: number }[] } | null;
    google: { change: number; current: number; prev: number; trend: 'up' | 'down' | 'flat'; chart: { date: string; value: number }[] } | null;
  } | null>(null);

  const defaultCompanies: SearchResult[] = useMemo(() => [
    { corpCode: '00126380', corpName: '삼성전자', stockCode: '005930' },
    { corpCode: '00164779', corpName: 'SK하이닉스', stockCode: '000660' },
    { corpCode: '00266961', corpName: '네이버', stockCode: '035420' },
    { corpCode: '00258801', corpName: '카카오', stockCode: '035720' },
    { corpCode: '00164742', corpName: '현대차', stockCode: '005380' },
  ], []);

  useEffect(() => {
    fetch('/api/dart/search?mode=popular')
      .then(r => r.json())
      .then(d => { if (d.results?.length > 0) setPopularCompanies(d.results); })
      .catch(() => {});
    setSelectedCorp(defaultCompanies[0]);
  }, [defaultCompanies]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dart/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch { setSearchResults([]); }
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
      const years = buildYears(yearRange);
      try {
        const [info, fin, profile] = await Promise.allSettled([
          fetch(`/api/dart/company?corp_code=${selectedCorp!.corpCode}`).then(r => r.ok ? r.json() : null),
          fetch(`/api/dart/financial?corp_code=${selectedCorp!.corpCode}&mode=${viewMode}&years=${years}`)
            .then(r => r.ok ? r.json() as Promise<DartFinancialResponse> : null),
          fetch(`/api/kis/profile?stock_code=${selectedCorp!.stockCode}`).then(r => r.ok ? r.json() : null),
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
    return () => { cancelled = true; };
  }, [selectedCorp, viewMode, yearRange]);

  // 프로필용 트렌드 요약 로드 (기업 선택 시)
  useEffect(() => {
    if (!companyInfo) return;
    let cancelled = false;

    function calcYoY(points: TrendPoint[]) {
      if (points.length < 2) return null;
      const current = points[points.length - 1].value;
      const first = points[0].value;
      const change = first > 0 ? Math.round((current - first) / first * 100) : 0;
      const chart = points.map(p => {
        const d = new Date(p.timestamp);
        return { date: `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}`, value: p.value };
      });
      return {
        change,
        current,
        prev: first,
        trend: (change > 5 ? 'up' : change < -5 ? 'down' : 'flat') as 'up' | 'down' | 'flat',
        chart,
      };
    }

    async function loadSummary() {
      try {
        const keyword = companyInfo!.corp_name.replace(/\(주\)|\(사\)/g, '').trim();
        const engRaw = companyInfo!.corp_name_eng || '';
        const keywordEn = engRaw.replace(/\s*(CO\b|LTD\b|INC\b|CORP\b|,|\.)+/gi, '').trim() || keyword;

        const res = await fetch(`/api/trends?keyword=${encodeURIComponent(keyword)}&keyword_en=${encodeURIComponent(keywordEn)}&period=12m`);
        if (!res.ok) { setTrendSummary(null); return; }
        const d: TrendsResponse = await res.json();
        if (cancelled) return;

        setTrendSummary({
          naver: calcYoY(d.naver),
          google: calcYoY(d.google.global),
        });
      } catch {
        if (!cancelled) setTrendSummary(null);
      }
    }
    loadSummary();
    return () => { cancelled = true; };
  }, [companyInfo]);

  // 관심도 데이터 로드 (탭 선택 시)
  useEffect(() => {
    if (activeTab !== 'interest' || !companyInfo) return;
    let cancelled = false;

    async function loadTrends() {
      setTrendsLoading(true);
      try {
        const keyword = companyInfo!.corp_name.replace(/\(주\)|\(사\)/g, '').trim();
        // 영문명에서 핵심 단어만 추출 (CO,.LTD 등 제거)
        const engRaw = companyInfo!.corp_name_eng || '';
        const keywordEn = engRaw.replace(/\s*(CO\b|LTD\b|INC\b|CORP\b|,|\.)+/gi, '').trim() || keyword;

        const res = await fetch(`/api/trends?keyword=${encodeURIComponent(keyword)}&keyword_en=${encodeURIComponent(keywordEn)}&period=${trendPeriod}`);
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
    return () => { cancelled = true; };
  }, [activeTab, companyInfo, trendPeriod]);

  const selectCompany = useCallback((company: SearchResult) => {
    setSelectedCorp(company);
    setSearchQuery('');
    setSearchOpen(false);
  }, []);

  const latest = useMemo(
    () => financialData.length > 0 ? financialData[financialData.length - 1] : null,
    [financialData]
  );

  const displayCompanies = popularCompanies.length > 0 ? popularCompanies.slice(0, 8) : defaultCompanies;

  /* ═══ 렌더링 ═══ */

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">

      {/* ── 페이지 타이틀 ── */}
      <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-wide mb-4 sm:mb-6">기업분석</h1>

      {/* ── 검색 ── */}
      <div ref={searchRef} className="relative mb-4 sm:mb-6">
        <div className="flex mb-3">
          <button className="flex-shrink-0 flex items-center justify-center w-10 bg-[var(--theme-accent)] border border-[var(--theme-accent)] rounded-l-xl">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            placeholder="기업명 또는 종목코드 (예: 삼성전자, 005930)"
            className="flex-1 px-3 py-2 font-heading text-sm font-bold bg-[var(--theme-bg-card)] border border-l-0 border-[var(--theme-border-muted)] rounded-r-xl text-[var(--foreground)] placeholder-gray-400 dark:placeholder-gray-500 focus:border-[var(--theme-accent)] focus:outline-none transition-colors"
          />
        </div>

        {/* 기업 칩 */}
        <div className="flex gap-1.5 flex-wrap">
          {displayCompanies.map((company) => (
            <button key={company.corpCode} onClick={() => selectCompany(company)}
              className={`font-heading text-xs sm:text-sm px-3 py-1.5 font-bold border rounded-lg transition-all ${
                selectedCorp?.corpCode === company.corpCode
                  ? 'bg-[var(--theme-accent)] text-white border-[var(--theme-accent)] shadow-md'
                  : 'bg-[var(--theme-bg-card)] text-gray-500 dark:text-gray-400 border-[var(--theme-border-muted)] hover:border-[var(--theme-accent)] hover:text-[var(--theme-accent)]'
              }`}>
              {company.corpName}
            </button>
          ))}
        </div>

        {/* 검색 드롭다운 */}
        {searchOpen && searchResults.length > 0 && (
          <div className="absolute z-50 left-0 right-0 top-[48px] bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl shadow-lg max-h-[280px] overflow-y-auto">
            {searchResults.map((r) => (
              <button key={r.corpCode} onClick={() => selectCompany(r)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-[var(--theme-accent)]/5 transition-colors border-b border-[var(--theme-border-muted)]/30 last:border-b-0">
                <span className="font-heading text-sm font-bold text-[var(--foreground)]">{r.corpName}</span>
                <span className="font-heading text-xs font-bold text-gray-400 tabular-nums">{r.stockCode}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 기업 헤더 ── */}
      {companyInfo && !loading && (
        <section className="mb-4 sm:mb-6 space-y-3">
          {/* 기업 정보 카드 */}
          <div className="card-base p-4 sm:p-5" style={{ boxShadow: 'var(--shadow-md)' }}>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="font-heading text-lg sm:text-3xl font-black text-[var(--foreground)] leading-none tracking-tight truncate">
                  {selectedCorp?.corpName || companyInfo.corp_name}
                </h2>
                <p className="font-heading text-sm font-bold text-gray-400 tabular-nums mt-1.5">{companyInfo.stock_code}</p>
              </div>
              {stockProfile && (
                <div className="text-right flex-shrink-0">
                  <p className="font-heading text-lg sm:text-3xl font-black text-[var(--foreground)] leading-none font-mono tabular-nums">{fmtPrice(stockProfile.currentPrice)}</p>
                  <div className="flex items-center justify-end gap-3 mt-1.5">
                    {stockProfile.per && <span className="font-heading text-xs sm:text-sm text-gray-500 dark:text-gray-400">PER <b className="text-[var(--foreground)] font-mono tabular-nums">{stockProfile.per.toFixed(1)}</b></span>}
                    {stockProfile.pbr && <span className="font-heading text-xs sm:text-sm text-gray-500 dark:text-gray-400">PBR <b className="text-[var(--foreground)] font-mono tabular-nums">{stockProfile.pbr.toFixed(2)}</b></span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 검색 트렌드 카드 2개 (좌우) */}
          {trendSummary && (trendSummary.google || trendSummary.naver) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Google 카드 */}
              <div className="card-base p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-heading text-sm font-bold text-[var(--foreground)]">Google 글로벌 검색량</p>
                    <p className="font-heading text-xs text-gray-500 dark:text-gray-400 mt-0.5">1년 전 대비</p>
                  </div>
                  {trendSummary.google && (
                    <div className="flex items-center gap-1">
                      <svg className={`w-4 h-4 ${
                        trendSummary.google.trend === 'up' ? 'text-emerald-500' : trendSummary.google.trend === 'down' ? 'text-red-500' : 'text-gray-400'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        {trendSummary.google.trend === 'up' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        ) : trendSummary.google.trend === 'down' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                        )}
                      </svg>
                      <span className="font-heading text-xl font-black tabular-nums" style={{
                        color: trendSummary.google.trend === 'up' ? C.positive : trendSummary.google.trend === 'down' ? C.negative : 'var(--foreground)'
                      }}>
                        {trendSummary.google.change > 0 ? '+' : ''}{trendSummary.google.change}%
                      </span>
                    </div>
                  )}
                </div>
                {trendSummary.google?.chart.length ? (
                  <div style={{ height: 70 }}>
                    <ResponsiveContainer>
                      <AreaChart data={trendSummary.google.chart} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="gProfileGoogle" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={trendSummary.google.trend === 'up' ? C.positive : trendSummary.google.trend === 'down' ? C.negative : '#94a3b8'} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={trendSummary.google.trend === 'up' ? C.positive : trendSummary.google.trend === 'down' ? C.negative : '#94a3b8'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="value" stroke={trendSummary.google.trend === 'up' ? C.positive : trendSummary.google.trend === 'down' ? C.negative : '#94a3b8'} strokeWidth={1.5} fill="url(#gProfileGoogle)" dot={false} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="font-heading text-sm text-gray-300 dark:text-gray-600 text-center py-4">-</p>
                )}
                <button onClick={() => setActiveTab('interest')} className="font-heading text-[11px] text-[var(--theme-accent)] font-bold mt-1.5 hover:underline">
                  관심도 탭에서 자세히 보기 →
                </button>
              </div>

              {/* 네이버 카드 */}
              <div className="card-base p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-heading text-sm font-bold text-[var(--foreground)]">네이버 검색량</p>
                    <p className="font-heading text-xs text-gray-500 dark:text-gray-400 mt-0.5">1년 전 대비</p>
                  </div>
                  {trendSummary.naver && (
                    <div className="flex items-center gap-1">
                      <svg className={`w-4 h-4 ${
                        trendSummary.naver.trend === 'up' ? 'text-emerald-500' : trendSummary.naver.trend === 'down' ? 'text-red-500' : 'text-gray-400'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        {trendSummary.naver.trend === 'up' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        ) : trendSummary.naver.trend === 'down' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                        )}
                      </svg>
                      <span className="font-heading text-xl font-black tabular-nums" style={{
                        color: trendSummary.naver.trend === 'up' ? C.positive : trendSummary.naver.trend === 'down' ? C.negative : 'var(--foreground)'
                      }}>
                        {trendSummary.naver.change > 0 ? '+' : ''}{trendSummary.naver.change}%
                      </span>
                    </div>
                  )}
                </div>
                {trendSummary.naver?.chart.length ? (
                  <div style={{ height: 70 }}>
                    <ResponsiveContainer>
                      <AreaChart data={trendSummary.naver.chart} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="gProfileNaver" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={trendSummary.naver.trend === 'up' ? C.positive : trendSummary.naver.trend === 'down' ? C.negative : '#94a3b8'} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={trendSummary.naver.trend === 'up' ? C.positive : trendSummary.naver.trend === 'down' ? C.negative : '#94a3b8'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="value" stroke={trendSummary.naver.trend === 'up' ? C.positive : trendSummary.naver.trend === 'down' ? C.negative : '#94a3b8'} strokeWidth={1.5} fill="url(#gProfileNaver)" dot={false} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="font-heading text-sm text-gray-300 dark:text-gray-600 text-center py-4">-</p>
                )}
                <button onClick={() => setActiveTab('interest')} className="font-heading text-[11px] text-[var(--theme-accent)] font-bold mt-1.5 hover:underline">
                  관심도 탭에서 자세히 보기 →
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {error && (
        <div className="card-base p-3 mb-4 border-l-4 border-l-[var(--theme-accent)]">
          <p className="font-heading text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* ── 탭 + 필터 ── */}
      {selectedCorp && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6 border-b-[3px] border-[var(--theme-border-muted)] pb-1">
          <div className="flex overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} disabled={loading}
                className={`font-heading text-sm sm:text-base px-3 sm:px-5 py-2.5 font-bold tracking-wide transition-all relative ${
                  activeTab === tab.key
                    ? 'text-[var(--theme-accent)] after:absolute after:bottom-[-3px] after:left-0 after:right-0 after:h-[3px] after:bg-[var(--theme-accent)]'
                    : 'text-gray-400 dark:text-gray-500 hover:text-[var(--foreground)]'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
            <div className="flex border border-[var(--theme-border-muted)] rounded-lg overflow-hidden">
              {YEAR_RANGES.map((r) => (
                <button key={r.key} onClick={() => setYearRange(r.key)} disabled={loading}
                  className={`font-heading text-xs px-2.5 py-1 font-bold transition-all ${
                    yearRange === r.key ? 'bg-[var(--theme-accent)] text-white' : 'text-gray-400 hover:text-[var(--foreground)] bg-[var(--theme-bg-card)]'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex border border-[var(--theme-border-muted)] rounded-lg overflow-hidden">
              {(['annual', 'quarterly'] as ViewMode[]).map((m) => (
                <button key={m} onClick={() => setViewMode(m)} disabled={loading}
                  className={`font-heading text-xs px-2.5 py-1 font-bold transition-all ${
                    viewMode === m ? 'bg-[var(--theme-accent)] text-white' : 'text-gray-400 hover:text-[var(--foreground)] bg-[var(--theme-bg-card)]'
                  }`}>
                  {m === 'annual' ? '연간' : '분기'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 본문 ── */}
      {!selectedCorp ? (
        <div className="pixel-empty-state">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="font-sans text-sm mb-2">기업을 선택하세요</p>
          <p className="font-sans text-xs text-gray-500">상장된 모든 기업의 재무제표를 분석할 수 있습니다</p>
        </div>
      ) : loading ? (
        <div className="space-y-3 sm:space-y-6">
          {[1, 2].map(i => (
            <div key={i} className="card-base p-5 sm:p-7">
              <div className="animate-pulse">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 w-28 mb-4" />
                <div className="h-[250px] bg-gray-100 dark:bg-gray-800/40" />
              </div>
            </div>
          ))}
        </div>
      ) : financialData.length === 0 ? (
        <div className="pixel-empty-state">
          <p className="font-sans text-sm mb-2">재무 데이터가 없습니다</p>
          <p className="font-sans text-xs text-gray-500">해당 기간의 DART 공시가 존재하지 않을 수 있습니다</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-6">
          {activeTab === 'performance' && <PerformanceTab data={financialData} />}
          {activeTab === 'profitability' && <ProfitabilityTab data={financialData} latest={latest} />}
          {activeTab === 'stability' && <StabilityTab data={financialData} />}
          {activeTab === 'cashflow' && <CashFlowTab data={financialData} />}
          {activeTab === 'interest' && <InterestTab data={trendsData} loading={trendsLoading} period={trendPeriod} setPeriod={setTrendPeriod} companyName={companyInfo?.corp_name?.replace(/\(주\)|\(사\)/g, '').trim() || ''} />}
        </div>
      )}

      {/* 출처 */}
      <p className="font-sans text-[9px] text-gray-400 dark:text-gray-600 mt-8 tracking-wide">
        DART Open API · 한국투자증권 · 연결재무제표(CFS) · 억원 단위
      </p>
    </div>
  );
}



/* ════════════════════════════ */
/*          차트 섹션           */
/* ════════════════════════════ */

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="card-base p-4 sm:p-5">
      <div className="flex items-baseline gap-2 mb-3">
        <h3 className="font-heading text-sm sm:text-base font-bold text-[var(--foreground)] tracking-wide leading-none">{title}</h3>
        {sub && <span className="font-heading text-[10px] text-gray-400 dark:text-gray-500">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

/* ════════════════════════════ */
/*          실적 탭            */
/* ════════════════════════════ */

function PerformanceTab({ data }: { data: FinancialMetrics[] }) {
  return (
    <>
      <Section title="매출·영업이익·순이익" sub="억원">
        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={data} barCategoryGap="20%">
              <CartesianGrid {...GRID} />
              <XAxis dataKey="period" tick={AX} axisLine={false} tickLine={false} />
              <YAxis tick={AX} axisLine={false} tickLine={false} tickFormatter={fmtYB} width={48} />
              <Tooltip content={<ChartTooltip fmt={(_, v) => fmtB(v)} />} />
              <Legend wrapperStyle={LEG} />
              <Bar dataKey="revenue" name="매출액" fill={C.revenue} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="operatingProfit" name="영업이익" fill={C.operatingProfit} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="netIncome" name="순이익" fill={C.netIncome} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {data.some(d => d.revenueGrowth !== null) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Section title="매출 성장률" sub="전년 대비 %">
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={data} barCategoryGap="25%">
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="period" tick={AX} axisLine={false} tickLine={false} />
                  <YAxis tick={AX} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={38} />
                  <Tooltip content={<ChartTooltip fmt={(_, v) => fmtPct(v, true)} />} />
                  <ReferenceLine y={0} stroke="var(--theme-border-muted)" strokeWidth={1} />
                  <Bar dataKey="revenueGrowth" name="매출 성장률" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                    {data.map((d, i) => (
                      <Cell key={i} fill={d.revenueGrowth !== null && d.revenueGrowth >= 0 ? C.revenue : C.negative} fillOpacity={0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <Section title="영업이익 성장률" sub="전년 대비 %">
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={data} barCategoryGap="25%">
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="period" tick={AX} axisLine={false} tickLine={false} />
                  <YAxis tick={AX} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={38} />
                  <Tooltip content={<ChartTooltip fmt={(_, v) => fmtPct(v, true)} />} />
                  <ReferenceLine y={0} stroke="var(--theme-border-muted)" strokeWidth={1} />
                  <Bar dataKey="profitGrowth" name="영업이익 성장률" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                    {data.map((d, i) => (
                      <Cell key={i} fill={d.profitGrowth !== null && d.profitGrowth >= 0 ? C.operatingProfit : C.negative} fillOpacity={0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>
      )}

      <Section title="상세 데이터">
        <DataTable data={data} columns={[
          { key: 'period', label: '기간', align: 'left' },
          { key: 'revenue', label: '매출액', fmt: fmtB },
          { key: 'operatingProfit', label: '영업이익', fmt: fmtB, color: v => v !== null && v < 0 ? C.negative : undefined },
          { key: 'netIncome', label: '순이익', fmt: fmtB, color: v => v !== null && v < 0 ? C.negative : undefined },
          { key: 'revenueGrowth', label: '매출성장', fmt: v => fmtPct(v, true), color: v => v !== null ? (v >= 0 ? C.positive : C.negative) : undefined, hideOnMobile: true },
          { key: 'profitGrowth', label: '이익성장', fmt: v => fmtPct(v, true), color: v => v !== null ? (v >= 0 ? C.positive : C.negative) : undefined, hideOnMobile: true },
        ]} />
      </Section>
    </>
  );
}

/* ════════════════════════════ */
/*         수익성 탭           */
/* ════════════════════════════ */

function ProfitabilityTab({ data, latest }: { data: FinancialMetrics[]; latest: FinancialMetrics | null }) {
  // 수익성 요약 계산
  const marginGap = latest && latest.operatingMargin !== null && latest.netMargin !== null
    ? Math.round((latest.operatingMargin - latest.netMargin) * 10) / 10 : null;

  return (
    <>
      {/* 핵심 질문: 100원 벌면 얼마 남기나? */}
      {latest && (
        <div className="card-base p-4 sm:p-5">
          <p className="font-heading text-xs font-bold text-gray-400 tracking-widest uppercase mb-3">100원 벌면 얼마 남기나?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="font-heading text-[11px] font-bold text-gray-400 mb-0.5">영업이익률</p>
              <p className="text-2xl font-black tabular-nums leading-none" style={{ color: latest.operatingMargin !== null ? (latest.operatingMargin >= 10 ? C.positive : latest.operatingMargin < 0 ? C.negative : 'var(--foreground)') : 'var(--foreground)' }}>
                {fmtPct(latest.operatingMargin)}
              </p>
              <p className="font-heading text-[11px] text-gray-400 mt-0.5">본업에서 남기는 이익</p>
            </div>
            <div>
              <p className="font-heading text-[11px] font-bold text-gray-400 mb-0.5">순이익률</p>
              <p className="text-2xl font-black tabular-nums leading-none" style={{ color: latest.netMargin !== null ? (latest.netMargin >= 7 ? C.positive : latest.netMargin < 0 ? C.negative : 'var(--foreground)') : 'var(--foreground)' }}>
                {fmtPct(latest.netMargin)}
              </p>
              <p className="font-heading text-[11px] text-gray-400 mt-0.5">세금·이자 제외 최종</p>
            </div>
            <div>
              <p className="font-heading text-[11px] font-bold text-gray-400 mb-0.5">영업↔순이익 차이</p>
              <p className="text-2xl font-black tabular-nums leading-none text-[var(--foreground)]">
                {marginGap !== null ? `${marginGap}%p` : '-'}
              </p>
              <p className="font-heading text-[11px] text-gray-400 mt-0.5">{marginGap !== null && marginGap > 10 ? '이자·세금 부담 큼' : '적정 수준'}</p>
            </div>
            <div>
              <p className="font-heading text-[11px] font-bold text-gray-400 mb-0.5">ROE</p>
              <p className="text-2xl font-black tabular-nums leading-none" style={{ color: latest.roe !== null ? (latest.roe >= 15 ? C.positive : latest.roe < 0 ? C.negative : 'var(--foreground)') : 'var(--foreground)' }}>
                {fmtPct(latest.roe)}
              </p>
              <p className="font-heading text-[11px] text-gray-400 mt-0.5">주주 돈 1억 → {latest.roe !== null ? `${Math.round(latest.roe * 100)}만원` : '-'} 수익</p>
            </div>
          </div>
        </div>
      )}

      {/* 마진 추이: 이익을 꾸준히 남기고 있나? */}
      <Section title="마진 추이" sub="이익을 꾸준히 남기고 있나?">
        <div style={{ height: 270 }}>
          <ResponsiveContainer>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gOM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.operatingMargin} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={C.operatingMargin} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gNM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.netMargin} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={C.netMargin} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="period" tick={AX} axisLine={false} tickLine={false} />
              <YAxis tick={AX} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={36} />
              <Tooltip content={<ChartTooltip fmt={(_, v) => fmtPct(v)} />} />
              <Legend wrapperStyle={LEG} />
              <ReferenceLine y={0} stroke="var(--theme-border-muted)" strokeWidth={1} />
              <Area type="monotone" dataKey="operatingMargin" name="영업이익률" stroke={C.operatingMargin} strokeWidth={2.5} fill="url(#gOM)" dot={{ r: 3, fill: C.operatingMargin, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} connectNulls />
              <Area type="monotone" dataKey="netMargin" name="순이익률" stroke={C.netMargin} strokeWidth={2.5} fill="url(#gNM)" dot={{ r: 3, fill: C.netMargin, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ROE vs ROA: 주주 돈을 잘 굴리나? */}
      <Section title="ROE / ROA" sub="주주·전체 자본을 얼마나 효율적으로 굴리나?">
        <div style={{ height: 250 }}>
          <ResponsiveContainer>
            <ComposedChart data={data}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="period" tick={AX} axisLine={false} tickLine={false} />
              <YAxis tick={AX} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={36} />
              <Tooltip content={<ChartTooltip fmt={(_, v) => fmtPct(v)} />} />
              <Legend wrapperStyle={LEG} />
              <ReferenceLine y={0} stroke="var(--theme-border-muted)" strokeWidth={1} />
              <ReferenceLine y={10} stroke={C.positive} strokeWidth={1} strokeDasharray="6 3" label={{ value: '10%', position: 'right', fill: C.positive, fontSize: 9, fontWeight: 700 }} />
              <Bar dataKey="roe" name="ROE" fill={C.roe} fillOpacity={0.2} stroke={C.roe} strokeWidth={1} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Line type="monotone" dataKey="roa" name="ROA" stroke={C.roa} strokeWidth={2.5} dot={{ r: 3, fill: C.roa, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="상세 데이터">
        <DataTable data={data} columns={[
          { key: 'period', label: '기간', align: 'left' },
          { key: 'operatingMargin', label: '영업이익률', fmt: fmtPct },
          { key: 'netMargin', label: '순이익률', fmt: fmtPct },
          { key: 'roe', label: 'ROE', fmt: fmtPct, color: v => v !== null ? (v >= 0 ? C.positive : C.negative) : undefined },
          { key: 'roa', label: 'ROA', fmt: fmtPct, color: v => v !== null ? (v >= 0 ? C.positive : C.negative) : undefined },
        ]} />
      </Section>
    </>
  );
}

/* ════════════════════════════ */
/*         안정성 탭           */
/* ════════════════════════════ */

function StabilityTab({ data }: { data: FinancialMetrics[] }) {
  const latest = data[data.length - 1];

  // 단기부채 vs 비유동부채 계산
  const debtBreakdown = useMemo(() =>
    data.map(d => ({
      ...d,
      nonCurrentLiabilities: (d.totalLiabilities !== null && d.currentLiabilities !== null)
        ? d.totalLiabilities - d.currentLiabilities : null,
      shortTermRatio: (d.currentLiabilities !== null && d.totalLiabilities !== null && d.totalLiabilities > 0)
        ? Math.round(d.currentLiabilities / d.totalLiabilities * 1000) / 10 : null,
    })), [data]);

  const latestBreakdown = debtBreakdown[debtBreakdown.length - 1];

  return (
    <>
      {/* 핵심 질문: 빚 갚을 능력이 되나? */}
      {latest && (
        <div className="card-base p-4 sm:p-5">
          <p className="font-heading text-xs font-bold text-gray-400 tracking-widest uppercase mb-3">빚 갚을 능력이 되나?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="font-heading text-[11px] font-bold text-gray-400 mb-0.5">부채비율</p>
              <p className="text-2xl font-black tabular-nums leading-none" style={{ color: latest.debtRatio !== null ? (latest.debtRatio > 200 ? C.negative : latest.debtRatio < 50 ? C.positive : 'var(--foreground)') : 'var(--foreground)' }}>
                {fmtPct(latest.debtRatio)}
              </p>
              <p className="font-heading text-[11px] text-gray-400 mt-0.5">{latest.debtRatio !== null ? (latest.debtRatio > 200 ? '과다 — 위험' : latest.debtRatio > 100 ? '보통' : '양호') : ''}</p>
            </div>
            <div>
              <p className="font-heading text-[11px] font-bold text-gray-400 mb-0.5">유동비율</p>
              <p className="text-2xl font-black tabular-nums leading-none" style={{ color: latest.currentRatio !== null ? (latest.currentRatio >= 200 ? C.positive : latest.currentRatio < 100 ? C.negative : 'var(--foreground)') : 'var(--foreground)' }}>
                {fmtPct(latest.currentRatio)}
              </p>
              <p className="font-heading text-[11px] text-gray-400 mt-0.5">{latest.currentRatio !== null ? (latest.currentRatio < 100 ? '1년 내 갚을 돈 부족' : latest.currentRatio >= 200 ? '단기 상환 여유' : '적정') : ''}</p>
            </div>
            <div>
              <p className="font-heading text-[11px] font-bold text-gray-400 mb-0.5">단기부채</p>
              <p className="text-2xl font-black tabular-nums leading-none text-[var(--foreground)]">
                {fmtB(latest.currentLiabilities)}
              </p>
              <p className="font-heading text-[11px] text-gray-400 mt-0.5">1년 내 갚아야 할 돈</p>
            </div>
            <div>
              <p className="font-heading text-[11px] font-bold text-gray-400 mb-0.5">단기부채 비중</p>
              <p className="text-2xl font-black tabular-nums leading-none" style={{ color: latestBreakdown?.shortTermRatio !== null && latestBreakdown.shortTermRatio !== undefined ? (latestBreakdown.shortTermRatio > 70 ? C.negative : 'var(--foreground)') : 'var(--foreground)' }}>
                {latestBreakdown?.shortTermRatio !== null ? fmtPct(latestBreakdown?.shortTermRatio ?? null) : '-'}
              </p>
              <p className="font-heading text-[11px] text-gray-400 mt-0.5">{latestBreakdown?.shortTermRatio !== null && latestBreakdown.shortTermRatio !== undefined ? (latestBreakdown.shortTermRatio > 70 ? '단기 상환 압박 큼' : '장기부채 위주 — 양호') : ''}</p>
            </div>
          </div>
        </div>
      )}

      {/* 단기 vs 장기 안정성 분리 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Section title="단기 안정성 — 유동비율" sub="유동자산 ÷ 유동부채 · 100% 이상이면 단기 상환 가능">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <ComposedChart data={data}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="period" tick={AX} axisLine={false} tickLine={false} />
                <YAxis tick={AX} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={36} />
                <Tooltip content={<ChartTooltip fmt={(_, v) => fmtPct(v)} />} />
                <ReferenceLine y={100} stroke={C.negative} strokeWidth={1} strokeDasharray="6 3" label={{ value: '100%', position: 'right', fill: C.negative, fontSize: 9, fontWeight: 700 }} />
                <ReferenceLine y={200} stroke={C.positive} strokeWidth={1} strokeDasharray="6 3" label={{ value: '200%', position: 'right', fill: C.positive, fontSize: 9, fontWeight: 700 }} />
                <Bar dataKey="currentRatio" name="유동비율" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.currentRatio !== null ? (d.currentRatio >= 200 ? C.positive : d.currentRatio < 100 ? C.negative : C.currentRatio) : '#94a3b8'} fillOpacity={0.5} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="장기 안정성 — 부채비율" sub="부채총계 ÷ 자본총계 · 100% 이하 양호">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <ComposedChart data={data}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="period" tick={AX} axisLine={false} tickLine={false} />
                <YAxis tick={AX} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={36} />
                <Tooltip content={<ChartTooltip fmt={(_, v) => fmtPct(v)} />} />
                <ReferenceLine y={100} stroke={C.debtRatio} strokeWidth={1} strokeDasharray="6 3" label={{ value: '100%', position: 'right', fill: C.debtRatio, fontSize: 9, fontWeight: 700 }} />
                <Bar dataKey="debtRatio" name="부채비율" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.debtRatio !== null ? (d.debtRatio > 200 ? C.negative : d.debtRatio > 100 ? C.debtRatio : C.positive) : '#94a3b8'} fillOpacity={0.5} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* 부채 구조: 단기 vs 장기 */}
      <Section title="부채 구조" sub="단기부채(1년 이내 상환) vs 장기부채">
        <div style={{ height: 270 }}>
          <ResponsiveContainer>
            <BarChart data={debtBreakdown} barCategoryGap="22%">
              <CartesianGrid {...GRID} />
              <XAxis dataKey="period" tick={AX} axisLine={false} tickLine={false} />
              <YAxis tick={AX} axisLine={false} tickLine={false} tickFormatter={fmtYB} width={48} />
              <Tooltip content={<ChartTooltip fmt={(_, v) => fmtB(v)} />} />
              <Legend wrapperStyle={LEG} />
              <Bar dataKey="currentLiabilities" name="단기부채" stackId="debt" fill={C.negative} fillOpacity={0.6} isAnimationActive={false} />
              <Bar dataKey="nonCurrentLiabilities" name="장기부채" stackId="debt" fill={C.debtRatio} fillOpacity={0.4} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* 자산 = 부채 + 자본 */}
      <Section title="자산 구성" sub="자산 = 부채 + 자본">
        <div style={{ height: 270 }}>
          <ResponsiveContainer>
            <BarChart data={data} barCategoryGap="22%">
              <CartesianGrid {...GRID} />
              <XAxis dataKey="period" tick={AX} axisLine={false} tickLine={false} />
              <YAxis tick={AX} axisLine={false} tickLine={false} tickFormatter={fmtYB} width={48} />
              <Tooltip content={<ChartTooltip fmt={(_, v) => fmtB(v)} />} />
              <Legend wrapperStyle={LEG} />
              <Bar dataKey="totalLiabilities" name="부채" stackId="bs" fill={C.negative} fillOpacity={0.35} isAnimationActive={false} />
              <Bar dataKey="totalEquity" name="자본" stackId="bs" fill={C.positive} fillOpacity={0.4} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="상세 데이터">
        <DataTable data={debtBreakdown} columns={[
          { key: 'period', label: '기간', align: 'left' },
          { key: 'currentLiabilities', label: '단기부채', fmt: fmtB },
          { key: 'nonCurrentLiabilities', label: '장기부채', fmt: fmtB },
          { key: 'totalEquity', label: '자본', fmt: fmtB },
          { key: 'debtRatio', label: '부채비율', fmt: fmtPct, color: v => v !== null && v > 100 ? C.debtRatio : undefined, hideOnMobile: true },
          { key: 'currentRatio', label: '유동비율', fmt: fmtPct, color: v => v !== null && v < 100 ? C.negative : undefined, hideOnMobile: true },
        ]} />
      </Section>
    </>
  );
}

/* ════════════════════════════ */
/*        현금흐름 탭          */
/* ════════════════════════════ */

function CashFlowTab({ data }: { data: FinancialMetrics[] }) {
  const latest = data[data.length - 1];
  const pattern = diagnoseCF(latest);

  const enriched = useMemo(() => {
    let cum = 0;
    return data.map(d => {
      if (d.freeCashFlow !== null) cum += d.freeCashFlow;
      const ccr = (d.operatingCashFlow !== null && d.operatingProfit !== null && d.operatingProfit !== 0)
        ? Math.round(d.operatingCashFlow / d.operatingProfit * 100) / 100 : null;
      const capex = (d.investingCashFlow !== null) ? Math.abs(d.investingCashFlow) : null;
      const capexR = (d.operatingCashFlow !== null && d.investingCashFlow !== null && d.operatingCashFlow > 0)
        ? Math.round(Math.abs(d.investingCashFlow) / d.operatingCashFlow * 1000) / 10 : null;
      return { ...d, cumulativeFCF: d.freeCashFlow !== null ? cum : null, cashConversion: ccr, capex, capexRatio: capexR };
    });
  }, [data]);

  return (
    <>
      {/* 패턴 진단 */}
      <div className="card-base p-4 sm:p-5 flex items-start gap-3">
        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center text-white font-black text-base rounded-xl" style={{ background: pattern.color }}>
          {pattern.code}
        </div>
        <div className="min-w-0">
          <p className="font-heading text-base font-black text-[var(--foreground)] leading-tight">{pattern.name} <span className="text-xs font-bold text-gray-400 ml-1">{latest?.period}</span></p>
          {pattern.desc && <p className="font-heading text-xs text-gray-400 mt-0.5 leading-relaxed">{pattern.desc}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs sm:text-sm">
            {[
              { label: '영업CF', v: latest?.operatingCashFlow },
              { label: '투자CF', v: latest?.investingCashFlow },
              { label: '재무CF', v: latest?.financingCashFlow },
              { label: 'FCF', v: latest?.freeCashFlow },
            ].map(({ label, v }) => (
              <span key={label} className="font-heading text-gray-400">{label}{' '}
                <b className="tabular-nums" style={{ color: v != null ? (v >= 0 ? C.positive : C.negative) : undefined }}>
                  {fmtB(v ?? null)}
                </b>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3대 현금흐름 */}
      <Section title="현금흐름 구조" sub="영업·투자·재무 (억원)">
        <div style={{ height: 290 }}>
          <ResponsiveContainer>
            <BarChart data={data} barCategoryGap="15%">
              <CartesianGrid {...GRID} />
              <XAxis dataKey="period" tick={AX} axisLine={false} tickLine={false} />
              <YAxis tick={AX} axisLine={false} tickLine={false} tickFormatter={fmtYB} width={48} />
              <Tooltip content={<ChartTooltip fmt={(_, v) => fmtB(v)} />} />
              <Legend wrapperStyle={LEG} />
              <ReferenceLine y={0} stroke="var(--theme-border-muted)" strokeWidth={1.5} />
              <Bar dataKey="operatingCashFlow" name="영업CF" fill={C.operatingCF} fillOpacity={0.7} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="investingCashFlow" name="투자CF" fill={C.investingCF} fillOpacity={0.7} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="financingCashFlow" name="재무CF" fill={C.financingCF} fillOpacity={0.7} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* FCF + 누적 FCF */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Section title="잉여현금흐름" sub="FCF = 영업CF + 투자CF">
          <div style={{ height: 230 }}>
            <ResponsiveContainer>
              <BarChart data={data} barCategoryGap="25%">
                <CartesianGrid {...GRID} />
                <XAxis dataKey="period" tick={AX} axisLine={false} tickLine={false} />
                <YAxis tick={AX} axisLine={false} tickLine={false} tickFormatter={fmtYB} width={42} />
                <Tooltip content={<ChartTooltip fmt={(_, v) => fmtB(v)} />} />
                <ReferenceLine y={0} stroke="var(--theme-border-muted)" strokeWidth={1} />
                <Bar dataKey="freeCashFlow" name="FCF" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                  {data.map((e, i) => (
                    <Cell key={i} fill={e.freeCashFlow !== null && e.freeCashFlow >= 0 ? C.fcf : C.negative} fillOpacity={0.65} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="누적 FCF" sub="기간 합산">
          <div style={{ height: 230 }}>
            <ResponsiveContainer>
              <AreaChart data={enriched}>
                <defs>
                  <linearGradient id="gCF" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.fcf} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={C.fcf} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="period" tick={AX} axisLine={false} tickLine={false} />
                <YAxis tick={AX} axisLine={false} tickLine={false} tickFormatter={fmtYB} width={42} />
                <Tooltip content={<ChartTooltip fmt={(_, v) => fmtB(v)} />} />
                <ReferenceLine y={0} stroke="var(--theme-border-muted)" strokeWidth={1} />
                <Area type="monotone" dataKey="cumulativeFCF" name="누적 FCF" stroke={C.fcf} strokeWidth={2.5} fill="url(#gCF)" dot={{ r: 3, fill: C.fcf, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* 이익의 질 + 현금전환비율 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Section title="이익의 질" sub="영업CF vs 순이익">
          <div style={{ height: 230 }}>
            <ResponsiveContainer>
              <BarChart data={data} barCategoryGap="18%">
                <CartesianGrid {...GRID} />
                <XAxis dataKey="period" tick={AX} axisLine={false} tickLine={false} />
                <YAxis tick={AX} axisLine={false} tickLine={false} tickFormatter={fmtYB} width={42} />
                <Tooltip content={<ChartTooltip fmt={(_, v) => fmtB(v)} />} />
                <Legend wrapperStyle={LEG} />
                <Bar dataKey="operatingCashFlow" name="영업CF" fill={C.operatingCF} fillOpacity={0.55} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="netIncome" name="순이익" fill={C.netIncome} fillOpacity={0.55} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="현금전환비율" sub="영업CF ÷ 영업이익 (1.0x 이상 양호)">
          <div style={{ height: 230 }}>
            <ResponsiveContainer>
              <BarChart data={enriched} barCategoryGap="25%">
                <CartesianGrid {...GRID} />
                <XAxis dataKey="period" tick={AX} axisLine={false} tickLine={false} />
                <YAxis tick={AX} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}x`} width={32} />
                <Tooltip content={<ChartTooltip fmt={(_, v) => fmtX(v)} />} />
                <ReferenceLine y={1} stroke={C.positive} strokeWidth={1} strokeDasharray="6 3" />
                <Bar dataKey="cashConversion" name="전환비율" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                  {enriched.map((e, i) => (
                    <Cell key={i} fill={e.cashConversion !== null && e.cashConversion >= 1 ? C.positive : C.debtRatio} fillOpacity={0.55} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* 투자 강도 */}
      <Section title="투자 강도" sub="영업CF 대비 투자 비중">
        <div style={{ height: 260 }}>
          <ResponsiveContainer>
            <ComposedChart data={enriched}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="period" tick={AX} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={AX} axisLine={false} tickLine={false} tickFormatter={fmtYB} width={48} />
              <YAxis yAxisId="right" orientation="right" tick={AX} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={36} />
              <Tooltip content={<ChartTooltip fmt={(n, v) => n === 'CAPEX비율' ? fmtPct(v) : fmtB(v)} />} />
              <Legend wrapperStyle={LEG} />
              <Bar yAxisId="left" dataKey="operatingCashFlow" name="영업CF" fill={C.operatingCF} fillOpacity={0.25} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Bar yAxisId="left" dataKey="capex" name="투자규모" fill={C.capex} fillOpacity={0.45} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Line yAxisId="right" type="monotone" dataKey="capexRatio" name="CAPEX비율" stroke={C.capex} strokeWidth={2.5} dot={{ r: 3, fill: C.capex, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* 패턴 히스토리 */}
      <Section title="현금흐름 패턴 변화">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {data.map((d) => {
            const p = diagnoseCF(d);
            return (
              <div key={d.period} className="flex-shrink-0 text-center w-[68px]">
                <div className="w-9 h-9 mx-auto mb-1 flex items-center justify-center text-white font-black text-xs rounded-lg" style={{ background: p.color }}>{p.code}</div>
                <p className="font-heading text-xs font-black text-[var(--foreground)]">{d.period}</p>
                <p className="font-heading text-[10px] text-gray-400 leading-tight mt-0.5">{p.name}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="상세 데이터">
        <DataTable data={data} columns={[
          { key: 'period', label: '기간', align: 'left' },
          { key: 'operatingCashFlow', label: '영업CF', fmt: fmtB, color: v => v !== null ? (v >= 0 ? C.positive : C.negative) : undefined },
          { key: 'investingCashFlow', label: '투자CF', fmt: fmtB },
          { key: 'financingCashFlow', label: '재무CF', fmt: fmtB, hideOnMobile: true },
          { key: 'freeCashFlow', label: 'FCF', fmt: fmtB, color: v => v !== null ? (v >= 0 ? C.positive : C.negative) : undefined },
        ]} />
      </Section>
    </>
  );
}

/* ════════════════════════════ */
/*         관심도 탭           */
/* ════════════════════════════ */

function InterestTab({ data, loading, period, setPeriod, companyName }: {
  data: TrendsResponse | null;
  loading: boolean;
  period: string;
  setPeriod: (p: string) => void;
  companyName: string;
}) {
  // 짧은 날짜 포맷: 25.03
  const shortDate = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // 구글 글로벌 차트 데이터
  const googleChartData = useMemo(() => {
    if (!data?.google.global.length) return [];
    return data.google.global.map((g, i) => {
      const kr = data.google.korea[i];
      return {
        date: shortDate(g.timestamp),
        global: g.value,
        korea: kr?.value ?? null,
      };
    });
  }, [data]);

  // 네이버 차트 데이터
  const naverChartData = useMemo(() => {
    if (!data?.naver.length) return [];
    return data.naver.map(p => ({
      date: shortDate(p.timestamp),
      value: p.value,
    }));
  }, [data]);

  // X축 간격 계산 (겹침 방지)
  const xInterval = (len: number) => Math.max(0, Math.floor(len / 8) - 1);

  const hasGoogle = googleChartData.length > 0;
  const hasNaver = naverChartData.length > 0;
  const hasAny = hasGoogle || hasNaver;

  // 피크/최신
  const gLatest = data?.google.global.at(-1);
  const gPeak = data?.google.global.reduce((max, p) => p.value > max.value ? p : max, data.google.global[0]);
  const nLatest = data?.naver.at(-1);
  const nPeak = data?.naver.length ? data.naver.reduce((max, p) => p.value > max.value ? p : max, data.naver[0]) : null;

  if (loading) {
    return (
      <div className="card-base p-5 sm:p-7">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 w-40 mb-4" />
          <div className="h-[300px] bg-gray-100 dark:bg-gray-800/40" />
        </div>
      </div>
    );
  }

  if (!hasAny) {
    return (
      <div className="pixel-empty-state">
        <p className="font-sans text-sm mb-2">관심도 데이터를 불러올 수 없습니다</p>
        <p className="font-sans text-xs text-gray-500">잠시 후 다시 시도해주세요</p>
      </div>
    );
  }

  // 피크 날짜 포맷
  const peakDate = (ts?: number) => ts ? shortDate(ts) : '';

  return (
    <>
      {/* 기간 선택 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="font-heading text-sm font-bold text-gray-400">기간</span>
        <div className="flex border border-[var(--theme-border-muted)] rounded-lg overflow-hidden">
          {TREND_PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`font-heading text-xs px-2.5 py-1 font-bold transition-all ${
                period === p.key ? 'bg-[var(--theme-accent)] text-white' : 'text-gray-400 hover:text-[var(--foreground)] bg-[var(--theme-bg-card)]'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="card-base p-5 sm:p-6" style={{ boxShadow: 'var(--shadow-md)' }}>
        <p className="font-heading text-sm font-bold text-[var(--foreground)] mb-4">
          "{companyName}" 검색 관심도
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <div>
            <p className="font-heading text-xs font-bold text-gray-400 mb-1">Google 현재</p>
            <p className="font-heading text-2xl font-black tabular-nums leading-none text-[var(--foreground)]">
              {gLatest?.value ?? '-'}<span className="text-sm text-gray-400 font-bold ml-0.5">/100</span>
            </p>
            <p className="font-heading text-xs text-gray-400 mt-1">"{data?.keywordEn}"</p>
          </div>
          <div>
            <p className="font-heading text-xs font-bold text-gray-400 mb-1">Google 피크</p>
            <p className="font-heading text-2xl font-black tabular-nums leading-none" style={{ color: C.revenue }}>
              {gPeak?.value ?? '-'}
            </p>
            <p className="font-heading text-xs text-gray-400 mt-1">{gPeak ? peakDate(gPeak.timestamp) : ''}</p>
          </div>
          <div>
            <p className="font-heading text-xs font-bold text-gray-400 mb-1">네이버 현재</p>
            <p className="font-heading text-2xl font-black tabular-nums leading-none text-[var(--foreground)]">
              {nLatest?.value ?? '-'}<span className="text-sm text-gray-400 font-bold ml-0.5">/100</span>
            </p>
            <p className="font-heading text-xs text-gray-400 mt-1">"{companyName}"</p>
          </div>
          <div>
            <p className="font-heading text-xs font-bold text-gray-400 mb-1">네이버 피크</p>
            <p className="font-heading text-2xl font-black tabular-nums leading-none" style={{ color: C.positive }}>
              {nPeak?.value ?? '-'}
            </p>
            <p className="font-heading text-xs text-gray-400 mt-1">{nPeak ? peakDate(nPeak.timestamp) : ''}</p>
          </div>
        </div>
      </div>

      {/* 네이버 + 구글을 2칸 그리드로 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        {/* 네이버 검색 트렌드 */}
        {hasNaver && (
          <Section title="네이버" sub={`"${companyName}" 검색 추이`}>
            <div style={{ height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={naverChartData}>
                  <defs>
                    <linearGradient id="gNaver" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.positive} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={C.positive} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="date" tick={AX} axisLine={false} tickLine={false} interval={xInterval(naverChartData.length)} />
                  <YAxis tick={AX} axisLine={false} tickLine={false} domain={[0, 100]} width={32} />
                  <Tooltip content={<ChartTooltip fmt={(_, v) => `${v} / 100`} />} />
                  <Area type="monotone" dataKey="value" name="네이버" stroke={C.positive} strokeWidth={2.5} fill="url(#gNaver)" dot={false} isAnimationActive={false} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}

        {/* 구글 글로벌 검색 트렌드 */}
        {hasGoogle && (
          <Section title="Google" sub={`"${data?.keywordEn}" 글로벌 검색 추이`}>
            <div style={{ height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={googleChartData}>
                  <defs>
                    <linearGradient id="gGoogle" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.revenue} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={C.revenue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="date" tick={AX} axisLine={false} tickLine={false} interval={xInterval(googleChartData.length)} />
                  <YAxis tick={AX} axisLine={false} tickLine={false} domain={[0, 100]} width={32} />
                  <Tooltip content={<ChartTooltip fmt={(_, v) => `${v} / 100`} />} />
                  <Area type="monotone" dataKey="global" name="Google" stroke={C.revenue} strokeWidth={2.5} fill="url(#gGoogle)" dot={false} isAnimationActive={false} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}
      </div>

      {/* 구글 한국 vs 글로벌 비교 */}
      {hasGoogle && googleChartData.some(d => d.korea !== null) && (
        <Section title="Google 글로벌 vs 한국" sub="같은 기업, 다른 관심도">
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={googleChartData}>
                <defs>
                  <linearGradient id="gGvK1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.revenue} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={C.revenue} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gGvK2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.operatingProfit} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={C.operatingProfit} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="date" tick={AX} axisLine={false} tickLine={false} interval={xInterval(googleChartData.length)} />
                <YAxis tick={AX} axisLine={false} tickLine={false} domain={[0, 100]} width={32} />
                <Tooltip content={<ChartTooltip fmt={(_, v) => `${v} / 100`} />} />
                <Legend wrapperStyle={LEG} />
                <Area type="monotone" dataKey="global" name="글로벌" stroke={C.revenue} strokeWidth={2} fill="url(#gGvK1)" dot={false} isAnimationActive={false} connectNulls />
                <Area type="monotone" dataKey="korea" name="한국" stroke={C.operatingProfit} strokeWidth={2} fill="url(#gGvK2)" dot={false} isAnimationActive={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}
    </>
  );
}

/* ════════════════════════════ */
/*         데이터 테이블        */
/* ════════════════════════════ */

interface ColDef {
  key: string;
  label: string;
  align?: 'left' | 'right';
  fmt?: (v: number | null) => string;
  color?: (v: number | null) => string | undefined;
  hideOnMobile?: boolean;
}

function DataTable({ data, columns }: { data: FinancialMetrics[]; columns: ColDef[] }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-[var(--theme-border-muted)]">
            {columns.map(col => (
              <th key={col.key}
                className={`font-heading text-xs font-bold py-2 px-2.5 text-gray-400 dark:text-gray-500 ${col.align === 'left' ? 'text-left' : 'text-right'} ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.period} className="border-b border-[var(--theme-border-muted)]/30 hover:bg-[var(--theme-accent)]/[0.03] transition-colors">
              {columns.map(col => {
                const val = (row as unknown as Record<string, unknown>)[col.key];
                const numVal = typeof val === 'number' ? val : null;
                const display = col.key === 'period' ? String(val) : (col.fmt ? col.fmt(numVal) : String(val ?? '-'));
                const c = col.color ? col.color(numVal) : undefined;
                return (
                  <td key={col.key}
                    className={`font-heading text-sm py-2 px-2.5 tabular-nums ${col.align === 'left' ? 'text-left font-black' : 'text-right font-bold'} ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}`}
                    style={{ color: c || 'var(--foreground)' }}>
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
