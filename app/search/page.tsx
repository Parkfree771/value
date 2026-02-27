'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReportCard from '@/components/ReportCard';
import SearchBar, { StockSuggestion } from '@/components/SearchBar';
import Container from '@/components/Container';
import { loadThemes, getSymbolsForThemes } from '@/lib/themeStocks';
import type { Theme } from '@/types/theme';

type SortType = 'latest' | 'returnDesc' | 'returnAsc' | 'popular';
type MarketFilter = 'all' | 'KR' | 'US' | 'JP' | 'CN' | 'HK';

const sortLabels: Record<SortType, string> = {
  latest: '최신순',
  returnDesc: '수익률↑',
  returnAsc: '수익률↓',
  popular: '인기순',
};

const marketLabels: Record<MarketFilter, string> = {
  all: '전체',
  KR: '한국',
  US: '미국',
  JP: '일본',
  CN: '중국',
  HK: '홍콩',
};

const MARKET_EXCHANGES: Record<string, string[]> = {
  KR: ['KRX'],
  US: ['NAS', 'NYS', 'AMS'],
  JP: ['TSE'],
  CN: ['SHS', 'SZS'],
  HK: ['HKS'],
};

// 테마 칩 (구루 포트 스타일)
const THEME_CHIP = 'flex-shrink-0 px-3 py-1.5 text-xs font-bold border-2 transition-colors';
const THEME_ACTIVE = `${THEME_CHIP} bg-ant-red-600 text-white border-ant-red-800 dark:bg-ant-red-600 dark:border-ant-red-400`;
const THEME_INACTIVE = `${THEME_CHIP} bg-pixel-card text-foreground border-pixel-border hover:bg-pixel-bg`;
const THEME_MORE = `${THEME_CHIP} bg-transparent text-[var(--pixel-accent)] border-[var(--pixel-accent)]`;

// 필터 (텍스트 스타일 - 상장사 & 정렬 공통)
const FILTER_BASE = 'flex-shrink-0 font-heading tracking-wide text-[10px] sm:text-xs px-1 py-0.5 sm:px-2 sm:py-1 transition-all';
const FILTER_ACTIVE = `${FILTER_BASE} font-bold text-[var(--pixel-accent)] border-b-2 border-[var(--pixel-accent)]`;
const FILTER_INACTIVE = `${FILTER_BASE} font-medium text-gray-400 dark:text-gray-500 hover:text-[var(--foreground)]`;

/** 측정 컨테이너에서 첫 줄에 들어가는 아이템 수 계산 */
function measureFirstRow(container: HTMLElement | null): number {
  if (!container) return Infinity;
  const children = Array.from(container.children) as HTMLElement[];
  if (children.length <= 1) return Infinity;
  const firstTop = children[0].offsetTop;
  let count = 0;
  for (const child of children) {
    if (child.offsetTop !== firstTop) break;
    count++;
  }
  return count >= children.length ? Infinity : Math.max(count - 1, 1);
}

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allThemes, setAllThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [sortType, setSortType] = useState<SortType>('latest');
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('all');

  // 테마 칩 더보기
  const [themeExpanded, setThemeExpanded] = useState(false);
  const [themeVisible, setThemeVisible] = useState(Infinity);
  const themeMeasureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      if (!themeExpanded) setThemeVisible(measureFirstRow(themeMeasureRef.current));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [allThemes, themeExpanded]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('/api/feed/public');
        const data = await response.json();
        if (data.posts) setReports(data.posts);
      } catch (error) {
        console.error('리포트 가져오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
    loadThemes().then(setAllThemes).catch(console.error);
  }, []);

  const handleSelectStock = (stock: StockSuggestion) => {};

  const themeSymbols = useMemo(() => {
    if (!selectedTheme || allThemes.length === 0) return null;
    return getSymbolsForThemes(allThemes, [selectedTheme]);
  }, [selectedTheme, allThemes]);

  const filteredReports = useMemo(() => {
    const filtered = reports.filter((report) => {
      if (themeSymbols) {
        const hasTagMatch = report.themes?.some((t: string) => t === selectedTheme);
        const hasSymbolMatch = themeSymbols.has(report.ticker.toUpperCase());
        if (!hasTagMatch && !hasSymbolMatch) return false;
      }
      if (marketFilter !== 'all') {
        const exchanges = MARKET_EXCHANGES[marketFilter];
        if (!exchanges || !exchanges.includes(report.exchange?.toUpperCase())) return false;
      }
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        (report.title || '').toLowerCase().includes(query) ||
        (report.stockName || '').toLowerCase().includes(query) ||
        (report.ticker || '').toLowerCase().includes(query) ||
        (report.author || '').toLowerCase().includes(query)
      );
    });

    return filtered.sort((a, b) => {
      switch (sortType) {
        case 'returnDesc': return (b.returnRate ?? 0) - (a.returnRate ?? 0);
        case 'returnAsc': return (a.returnRate ?? 0) - (b.returnRate ?? 0);
        case 'popular': return (b.likes ?? 0) - (a.likes ?? 0);
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [reports, themeSymbols, selectedTheme, marketFilter, searchQuery, sortType]);

  const selectedThemeName = selectedTheme
    ? allThemes.find(t => t.id === selectedTheme)?.name
    : null;

  const themeItems = useMemo(() => [
    { id: null, name: '전체' },
    ...allThemes.map(t => ({ id: t.id as string | null, name: t.name })),
  ], [allThemes]);

  const sortKeys = Object.keys(sortLabels) as SortType[];
  const marketKeys = Object.keys(marketLabels) as MarketFilter[];
  const totalThemes = themeItems.length;

  return (
    <Container>
      {/* 1. Header + Search Bar */}
      <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-wide mb-2">검색</h1>
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeholder=""
        showStockSuggestions={false}
        onSelectStock={handleSelectStock}
      />

      {/* 2. 테마 칩 (더보기 방식) */}
      {allThemes.length > 0 && (
        <div className="mb-3 sm:mb-4 relative">
          {/* 숨겨진 측정용 */}
          <div
            ref={themeMeasureRef}
            className="flex flex-wrap gap-1.5 sm:gap-2 invisible absolute inset-x-0 top-0 pointer-events-none"
            aria-hidden="true"
          >
            {themeItems.map((t, i) => (
              <span key={i} className={THEME_INACTIVE}>{t.name}</span>
            ))}
          </div>

          <div className={`flex gap-1.5 sm:gap-2 ${themeExpanded ? 'flex-wrap' : 'flex-nowrap'}`}>
            {(themeExpanded ? themeItems : themeItems.slice(0, themeVisible)).map((t) => (
              <button
                key={t.id ?? 'all'}
                onClick={() => setSelectedTheme(t.id === selectedTheme ? null : t.id)}
                className={selectedTheme === t.id || (t.id === null && selectedTheme === null) ? THEME_ACTIVE : THEME_INACTIVE}
                style={{ boxShadow: (selectedTheme === t.id || (t.id === null && selectedTheme === null)) ? 'var(--shadow-sm)' : 'none' }}
              >
                {t.name}
              </button>
            ))}
            {!themeExpanded && themeVisible < totalThemes && (
              <button onClick={() => setThemeExpanded(true)} className={THEME_MORE}>
                +{totalThemes - themeVisible}
              </button>
            )}
            {themeExpanded && themeVisible < totalThemes && (
              <button onClick={() => setThemeExpanded(false)} className={THEME_MORE}>
                접기
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. 필터: 왼쪽 상장사 | 오른쪽 정렬 */}
      <div className="mb-3 sm:mb-4 flex justify-between items-center overflow-x-auto scrollbar-hide">
        <div className="flex gap-0.5 sm:gap-1 flex-nowrap items-center">
          {marketKeys.map((m) => (
            <button
              key={m}
              onClick={() => setMarketFilter(m)}
              className={marketFilter === m ? FILTER_ACTIVE : FILTER_INACTIVE}
            >
              {marketLabels[m]}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 sm:gap-1 flex-nowrap ml-2 items-center">
          {sortKeys.map((type) => (
            <button
              key={type}
              onClick={() => setSortType(type)}
              className={sortType === type ? FILTER_ACTIVE : FILTER_INACTIVE}
            >
              {sortLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Results Summary */}
      {(searchQuery || selectedTheme) && (
        <div className="mb-4 px-2">
          <p className="font-pixel text-xs text-gray-500 dark:text-gray-400">
            {selectedThemeName && (
              <span className="text-[var(--pixel-accent)] font-bold">[{selectedThemeName}] </span>
            )}
            {searchQuery && (
              <>검색: <span className="font-bold">&ldquo;{searchQuery}&rdquo;</span></>
            )}
            {' '}결과 {filteredReports.length}개
          </p>
        </div>
      )}

      {/* Reports */}
      <div className="space-y-3 sm:space-y-6">
        {loading ? (
          <div className="pixel-empty-state">
            <p className="font-pixel text-sm">로딩 중...</p>
          </div>
        ) : filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <ReportCard key={report.id} {...report} />
          ))
        ) : (searchQuery || selectedTheme || marketFilter !== 'all') ? (
          <div className="pixel-empty-state">
            <svg className="w-10 h-10 sm:w-16 sm:h-16 mx-auto text-[var(--pixel-border-muted)] mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="font-pixel text-sm mb-1 sm:mb-2">검색 결과가 없습니다</p>
            <p className="font-pixel text-xs text-gray-500 dark:text-gray-400">
              다른 검색어를 입력하거나 필터를 변경해보세요
            </p>
          </div>
        ) : (
          <div className="pixel-empty-state">
            <svg className="w-10 h-10 sm:w-16 sm:h-16 mx-auto text-[var(--pixel-border-muted)] mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="font-pixel text-sm mb-1 sm:mb-2">검색어를 입력해주세요</p>
            <p className="font-pixel text-xs text-gray-500 dark:text-gray-400">
              테마를 선택하거나 검색어를 입력하세요
            </p>
          </div>
        )}
      </div>

      {filteredReports.length > 0 && (
        <div className="text-center mt-6 sm:mt-8">
          <button className="w-full sm:w-auto btn-primary font-pixel">더 보기</button>
        </div>
      )}
    </Container>
  );
}
