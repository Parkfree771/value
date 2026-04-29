'use client';

import Container from '@/components/Container';

/* ─── 타입 ─── */

interface MarketQuote {
  price: number;
  change: number;
  changePercent: string;
  previousClose: number;
}

interface MarketItem {
  symbol: string;
  name: string;
  type: string;
  quote: MarketQuote | null;
  sparkline: { time: string; close: number }[];
}

interface ForexItem {
  from: string;
  to: string;
  name: string;
  rate: { price: number; lastUpdated: string } | null;
}

interface MarketData {
  collected_at: string;
  collected_at_kr: string;
  market: MarketItem[];
  forex: ForexItem[];
}

interface BriefingIssue {
  headline: string;
  summary: string;
  tags: string[];
  covered_by: string[];
  sources: string;
  importance: 'high' | 'medium' | 'low';
}

interface BriefingData {
  generated_at: string;
  generated_at_kr: string;
  source_articles: number;
  issues: BriefingIssue[];
}

type CountryKey = 'US';

interface CountryBundle {
  briefing: BriefingData | null;
  market: MarketData | null;
}

interface CountryTheme {
  key: CountryKey;
  label: string;
  flag: string;
  subtitle: string;
  accent: string;
  accentDark: string;
  badge: string;
}

const THEMES: Record<CountryKey, CountryTheme> = {
  US: {
    key: 'US',
    label: '미국',
    flag: '🇺🇸',
    subtitle: '미국 주요 매체 분석 기반 시장 브리핑',
    accent: '#3b50b5',
    accentDark: '#2a3a8a',
    badge: 'US BRIEFING',
  },
};

/* ─── 유틸 ─── */

function parsePercent(str: string): number {
  return parseFloat(str.replace('%', ''));
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── 미니 차트 ─── */

function MiniChart({ data, positive, id }: { data: number[]; positive: boolean; id: string }) {
  if (data.length < 2) return null;

  const w = 80;
  const h = 40;
  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: pad + (1 - (v - min) / range) * (h - pad * 2),
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`;
  const color = positive ? '#22c55e' : '#ef4444';
  const gradId = `g-${id}`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ─── 국가별 패널 ─── */

function CountryPanel({ bundle, theme }: { bundle: CountryBundle; theme: CountryTheme }) {
  const { briefing, market } = bundle;

  if (!briefing && !market) {
    return (
      <div className="card-base p-6 text-center">
        <p className="text-xl mb-2 opacity-20 font-bold">{theme.badge}</p>
        <p className="text-muted text-sm">브리핑 데이터가 없습니다.</p>
      </div>
    );
  }

  const dateStr = briefing?.generated_at_kr || market?.collected_at_kr || '';

  return (
    <div className="card-base p-4 sm:p-6" style={{ borderColor: theme.accent }}>
      {/* 헤더 */}
      <div
        className="flex items-center justify-between mb-5 pb-3 border-b-2"
        style={{ borderColor: `${theme.accent}33` }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-lg text-white tracking-wider"
            style={{ backgroundColor: theme.accent }}
          >
            {theme.flag} {theme.badge}
          </span>
          {dateStr && (
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-bold">{dateStr}</span>
          )}
        </div>
        {briefing && (
          <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-semibold">
            {briefing.source_articles}개 기사 분석
          </span>
        )}
      </div>

      {/* 시장 가격 + 환율 */}
      {market && (market.market.length > 0 || (market.forex && market.forex.length > 0)) && (
        <div className="mb-6">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {market.market.map((item) => {
              if (!item.quote) return null;
              const pct = parsePercent(item.quote.changePercent);
              const positive = pct >= 0;
              const color = positive ? '#22c55e' : '#ef4444';
              const sparkData = item.sparkline.length > 0
                ? item.sparkline.map((s) => s.close)
                : [item.quote.previousClose, item.quote.price];

              return (
                <div
                  key={item.symbol}
                  className="rounded-xl p-3 sm:p-4 flex items-center gap-2 border-2 bg-[var(--theme-bg-card)] transition-all cursor-default"
                  style={{
                    borderColor: color,
                    boxShadow: `1.7px 1.7px 0px ${color}`,
                  }}
                >
                  <div className="shrink-0">
                    <div className="text-base sm:text-lg font-black font-heading text-gray-900 dark:text-white leading-tight">
                      {item.name}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 font-mono tracking-tight mt-0.5">
                      {item.type === 'commodity' ? '$' : ''}{formatPrice(item.quote.price)}
                    </div>
                    <div
                      className="text-lg sm:text-xl font-black font-heading tracking-tight leading-tight mt-0.5"
                      style={{ color }}
                    >
                      {positive ? '+' : ''}{pct.toFixed(2)}%
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex items-end justify-end">
                    <MiniChart data={sparkData} positive={positive} id={`${theme.key}-${item.symbol}`} />
                  </div>
                </div>
              );
            })}

            {market.forex && market.forex.map((fx) => {
              if (!fx.rate) return null;
              const isJpy = fx.from === 'JPY';
              const displayPrice = isJpy ? fx.rate.price * 100 : fx.rate.price;
              const displayName = isJpy ? '100엔/원' : fx.name;
              const displayPair = isJpy ? '100 JPY/KRW' : `${fx.from}/${fx.to}`;
              return (
                <div
                  key={`fx-${fx.from}-${fx.to}`}
                  className="rounded-xl p-3 sm:p-4 flex flex-col justify-center border-2 bg-[var(--theme-bg-card)] transition-all cursor-default"
                  style={{
                    borderColor: theme.accent,
                    boxShadow: `1.7px 1.7px 0px ${theme.accent}`,
                  }}
                >
                  <div className="text-base sm:text-lg font-black font-heading text-gray-900 dark:text-white leading-tight">
                    {displayName}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 font-mono tracking-tight mt-0.5">
                    {displayPair}
                  </div>
                  <div
                    className="text-lg sm:text-xl font-black font-heading font-mono tracking-tight leading-tight mt-0.5"
                    style={{ color: theme.accent }}
                  >
                    {Math.round(displayPrice).toLocaleString('en-US')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 이슈 리스트 */}
      {briefing && briefing.issues.length > 0 && (
        <div className="flex flex-col gap-3">
          {briefing.issues.map((issue, idx) => (
            <div
              key={idx}
              className="rounded-xl p-3 sm:p-5 border-2 bg-[var(--theme-bg-card)] transition-all"
              style={{
                borderColor: theme.accent,
                boxShadow: `1.7px 1.7px 0px ${theme.accent}`,
              }}
            >
              <div className="flex gap-3 sm:gap-4">
                <span
                  className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-black text-white"
                  style={{ backgroundColor: theme.accent }}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-black font-heading leading-snug text-gray-900 dark:text-white mb-2">
                    {issue.headline}
                  </h3>
                  <p className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-200 leading-relaxed">
                    {issue.summary}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── 메인 ─── */

export default function BriefingClient({
  data,
}: {
  data: Record<CountryKey, CountryBundle>;
}) {
  const theme = THEMES.US;

  return (
    <Container>
      {/* 페이지 헤더 */}
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-black font-heading">글로벌 브리핑</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{theme.subtitle}</p>
      </div>

      {/* 활성 국가 패널 */}
      <div className="flex flex-col gap-4">
        <CountryPanel bundle={data.US} theme={theme} />
      </div>
    </Container>
  );
}
