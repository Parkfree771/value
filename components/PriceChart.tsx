'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';
import Card from '@/components/Card';

interface PriceChartProps {
  ticker: string;
  initialPrice: number;
  currentPrice: number;
  createdAt: string;
  returnRate: number;
  positionType?: 'long' | 'short';
  currency?: string;
}

interface PricePoint {
  date: string;
  close: number;
}

interface ChartPoint extends PricePoint {
  plot: number;
}

interface ApiResponse {
  ticker: string;
  exchange: string;
  lastUpdated: string;
  history: Array<{ d: string; c: number }>;
}

/**
 * 백필이 안 된 경우 fallback: 작성가 → 현재가 두 점
 * 차트는 그래도 의미 있게 보임 (수직 선이 아니라 하향/상향 라인)
 */
function fallbackTwoPoint(
  initialPrice: number,
  currentPrice: number,
  createdAt: string
): PricePoint[] {
  const start = createdAt.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  if (start === today) {
    return [
      { date: start, close: initialPrice },
      { date: today, close: currentPrice },
    ];
  }
  return [
    { date: start, close: initialPrice },
    { date: today, close: currentPrice },
  ];
}

/**
 * 달력 기준 forward-fill.
 * Storage엔 거래일 종가만 sparse하게 저장되므로, 차트 X축이 달력 시간으로
 * 자연스럽게 흐르도록 휴장일 빈 칸을 직전 종가로 채움.
 *
 * 예) [Fri:100, Mon:102] → [Fri:100, Sat:100, Sun:100, Mon:102]
 *
 * 입력은 정렬 안 되어 있어도 OK. UTC 기준으로 처리.
 */
function forwardFillCalendar(points: PricePoint[]): PricePoint[] {
  if (points.length < 2) return points;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const result: PricePoint[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const cursor = new Date(`${prev.date}T00:00:00Z`);
    const target = new Date(`${cur.date}T00:00:00Z`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    while (cursor < target) {
      result.push({
        date: cursor.toISOString().slice(0, 10),
        close: prev.close,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    result.push(cur);
  }

  return result;
}

const formatDate = (d: string) => {
  const dt = new Date(d);
  const yy = String(dt.getFullYear()).slice(2);
  return `${yy}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
};

interface TooltipPayload {
  value: number;
  payload: ChartPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  currency?: string;
  initialPrice: number;
  positionType: 'long' | 'short';
}

function CustomTooltip({
  active,
  payload,
  label,
  currency,
  initialPrice,
  positionType,
}: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null;
  // payload[0].value는 미러링된 plot 값일 수 있으므로, 실제 종가는 payload에서 직접 가져옴
  const close = payload[0].payload.close;
  const ret =
    positionType === 'short'
      ? ((initialPrice - close) / initialPrice) * 100
      : ((close - initialPrice) / initialPrice) * 100;
  const retColor =
    ret > 0.001
      ? 'text-red-500 dark:text-red-400'
      : ret < -0.001
      ? 'text-blue-500 dark:text-blue-400'
      : 'text-gray-500 dark:text-gray-400';

  return (
    <div className="rounded-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg px-3 py-2">
      <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500 mb-1 tabular-nums">
        {formatDate(label)}
      </div>
      <div className="text-sm font-bold font-mono tabular-nums text-gray-900 dark:text-white">
        {close.toLocaleString()}
        {currency ? <span className="text-[10px] ml-1 font-normal text-gray-400">{currency}</span> : null}
      </div>
      <div className={`text-xs font-bold font-mono tabular-nums mt-0.5 ${retColor}`}>
        {ret > 0 ? '+' : ''}
        {ret.toFixed(2)}%
      </div>
    </div>
  );
}

export default function PriceChart({
  ticker,
  initialPrice,
  currentPrice,
  createdAt,
  returnRate,
  positionType = 'long',
  currency,
}: PriceChartProps) {
  const [history, setHistory] = useState<PricePoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Storage JSON에서 일별 종가 시계열 fetch
  useEffect(() => {
    let cancelled = false;
    const from = createdAt.slice(0, 10);
    const url = `/api/prices-history/${encodeURIComponent(ticker.toUpperCase())}?from=${from}`;

    fetch(url)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          // 404 등 - fallback (작성가→현재가 두 점, 사이는 forward-fill)
          setHistory(forwardFillCalendar(fallbackTwoPoint(initialPrice, currentPrice, createdAt)));
          return;
        }
        const data: ApiResponse = await res.json();
        const today = new Date().toISOString().slice(0, 10);

        // 작성일은 작성가(initialPrice)로 앵커링, 오늘은 currentPrice로 앵커링.
        // API의 작성일/오늘 종가는 사용자가 입력한 작성가/현재가와 다를 수 있으므로
        // 양 끝점은 표시값과 정확히 일치하도록 강제한다.
        const points: PricePoint[] = data.history
          .filter((p) => p.d > from && p.d < today)
          .map((p) => ({ date: p.d, close: p.c }));

        points.unshift({ date: from, close: initialPrice });
        if (today > from) {
          points.push({ date: today, close: currentPrice });
        }
        // 거래일만 들어있는 sparse 배열을 달력 기준으로 forward-fill
        setHistory(forwardFillCalendar(points));
      })
      .catch(() => {
        if (!cancelled) {
          setHistory(forwardFillCalendar(fallbackTwoPoint(initialPrice, currentPrice, createdAt)));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticker, createdAt, initialPrice, currentPrice]);

  // 숏 포지션은 작성가 기준으로 가격을 미러링해서, "가격 하락=수익=차트 상승"으로 표시
  const isShort = positionType === 'short';
  const toPlot = (v: number) => (isShort ? 2 * initialPrice - v : v);

  const data: ChartPoint[] = useMemo(
    () => (history ?? []).map((p) => ({ ...p, plot: toPlot(p.close) })),
    // toPlot는 isShort, initialPrice에 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, isShort, initialPrice]
  );

  if (!initialPrice || !currentPrice) return null;
  if (loading || data.length < 2) {
    return (
      <Card padding="none" className="px-4 py-4 sm:px-6 sm:py-5 animate-pulse">
        <div className="flex items-start justify-between mb-4 sm:mb-5">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-[180px] sm:h-[220px] bg-gray-100 dark:bg-gray-800 rounded" />
      </Card>
    );
  }

  const isPositive = returnRate > 0.001;
  const isNegative = returnRate < -0.001;

  // 한국 주식 컨벤션: 양수=빨강 / 음수=파랑
  const accentColor = isPositive ? '#dc2626' : isNegative ? '#2563eb' : '#6b7280';
  const gradientId = `priceGradient-${isPositive ? 'pos' : isNegative ? 'neg' : 'flat'}`;

  // Y축은 차트에 실제 그려지는 값(plot) 기준
  const plotValues = data.map((d) => d.plot);
  const minPlot = Math.min(...plotValues, initialPrice);
  const maxPlot = Math.max(...plotValues, initialPrice);
  const range = maxPlot - minPlot || initialPrice * 0.05;
  const yMin = minPlot - range * 0.18;
  const yMax = maxPlot + range * 0.18;

  // Y축 정확히 균등 간격 (5개 눈금)
  const Y_TICK_COUNT = 5;
  const yStep = (yMax - yMin) / (Y_TICK_COUNT - 1);
  const yTicks = Array.from({ length: Y_TICK_COUNT }, (_, i) => yMin + yStep * i);

  // 숏은 가격이 내려야 수익이므로 priceDelta 부호도 반전
  const priceDelta = isShort ? initialPrice - currentPrice : currentPrice - initialPrice;
  const startDate = data[0].date;
  const endDate = data[data.length - 1].date;

  return (
    <Card padding="none" className="px-4 py-4 sm:px-6 sm:py-5 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 sm:mb-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
            수익률 추이
          </span>
          <span className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 font-mono tabular-nums">
            {formatDate(startDate)} – {formatDate(endDate)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span
            className={`text-2xl sm:text-3xl font-black font-mono tabular-nums leading-none ${
              isPositive
                ? 'text-red-600 dark:text-red-500'
                : isNegative
                ? 'text-blue-600 dark:text-blue-500'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {isPositive ? '+' : ''}
            {returnRate.toFixed(2)}%
          </span>
          <div className="flex items-baseline gap-1.5 mt-1.5 font-mono tabular-nums">
            <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
              {currentPrice.toLocaleString()}
            </span>
            {currency && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{currency}</span>
            )}
            <span
              className={`text-[10px] sm:text-xs font-bold ${
                isPositive
                  ? 'text-red-600 dark:text-red-400'
                  : isNegative
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {priceDelta >= 0 ? '+' : ''}
              {priceDelta.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[180px] sm:h-[220px] -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 32, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.28} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="currentColor"
              className="text-gray-300 dark:text-gray-700"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: 'currentColor', fontFamily: 'var(--font-mono), ui-monospace, monospace' }}
              className="text-gray-600 dark:text-gray-300"
              axisLine={false}
              tickLine={false}
              ticks={[startDate, endDate]}
              interval="preserveStartEnd"
              padding={{ left: 6, right: 6 }}
            />
            <YAxis
              domain={[yMin, yMax]}
              ticks={yTicks}
              interval={0}
              tickFormatter={(v) => {
                // plot 공간 → 실제 가격으로 역변환 (toPlot은 self-inverse)
                const raw = toPlot(v);
                if (Math.abs(raw) >= 1_000_000) return `${(raw / 1_000_000).toFixed(1)}M`;
                if (Math.abs(raw) >= 10_000) return `${Math.round(raw / 1000)}K`;
                if (Math.abs(raw) >= 1000) return Math.round(raw).toLocaleString();
                return raw.toFixed(2);
              }}
              tick={{ fontSize: 11, fill: 'currentColor', fontFamily: 'var(--font-mono), ui-monospace, monospace' }}
              className="text-gray-600 dark:text-gray-300"
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              cursor={{
                stroke: '#9ca3af',
                strokeWidth: 1,
                strokeDasharray: '3 3',
              }}
              content={
                <CustomTooltip
                  currency={currency}
                  initialPrice={initialPrice}
                  positionType={positionType}
                />
              }
            />
            <ReferenceLine
              y={initialPrice}
              stroke="#9ca3af"
              strokeDasharray="3 3"
              strokeWidth={1}
              strokeOpacity={0.55}
            />
            <Area
              type="monotone"
              dataKey="plot"
              stroke={accentColor}
              strokeWidth={2.25}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={endDate}
              y={toPlot(currentPrice)}
              r={4}
              fill={accentColor}
              stroke="#ffffff"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer — 작성가 기준선 안내 */}
      <div className="flex items-center gap-1.5 mt-3 text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
        <span className="inline-block w-3 h-px border-t border-dashed border-gray-400 dark:border-gray-500" />
        <span className="font-mono tabular-nums">
          작성가 {initialPrice.toLocaleString()}
          {currency ? ` ${currency}` : ''}
        </span>
      </div>
    </Card>
  );
}
