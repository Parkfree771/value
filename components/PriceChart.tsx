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

const formatDate = (d: string) => {
  const dt = new Date(d);
  const yy = String(dt.getFullYear()).slice(2);
  return `${yy}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
};

interface TooltipPayload {
  value: number;
  payload: PricePoint;
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
  const close = payload[0].value;
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
          // 404 등 - fallback (작성가→현재가 두 점)
          setHistory(fallbackTwoPoint(initialPrice, currentPrice, createdAt));
          return;
        }
        const data: ApiResponse = await res.json();
        const points: PricePoint[] = data.history.map((p) => ({ date: p.d, close: p.c }));

        // 마지막 종가가 currentPrice와 다르거나 오늘 데이터가 없으면 현재가 한 점 추가
        const today = new Date().toISOString().slice(0, 10);
        if (points.length === 0) {
          setHistory(fallbackTwoPoint(initialPrice, currentPrice, createdAt));
          return;
        }
        const last = points[points.length - 1];
        if (last.date < today) {
          points.push({ date: today, close: currentPrice });
        }
        // 첫 점이 작성일보다 늦으면 (백필이 그 이전을 못 잡았을 때) 작성가 점 prepend
        if (points[0].date > from) {
          points.unshift({ date: from, close: initialPrice });
        }
        setHistory(points);
      })
      .catch(() => {
        if (!cancelled) setHistory(fallbackTwoPoint(initialPrice, currentPrice, createdAt));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticker, createdAt, initialPrice, currentPrice]);

  const data = useMemo(() => history ?? [], [history]);

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

  const closes = data.map((d) => d.close);
  const minClose = Math.min(...closes, initialPrice);
  const maxClose = Math.max(...closes, initialPrice);
  const range = maxClose - minClose || initialPrice * 0.05;
  const yMin = minClose - range * 0.18;
  const yMax = maxClose + range * 0.18;

  // Y축 정확히 균등 간격 (5개 눈금)
  const Y_TICK_COUNT = 5;
  const yStep = (yMax - yMin) / (Y_TICK_COUNT - 1);
  const yTicks = Array.from({ length: Y_TICK_COUNT }, (_, i) => yMin + yStep * i);

  const priceDelta = currentPrice - initialPrice;
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
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
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
                if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (Math.abs(v) >= 10_000) return `${Math.round(v / 1000)}K`;
                if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString();
                return v.toFixed(2);
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
              dataKey="close"
              stroke={accentColor}
              strokeWidth={2.25}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={endDate}
              y={currentPrice}
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
