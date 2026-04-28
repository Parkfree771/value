'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TrendsResponse } from '../types';
import { COLOR, AXIS_TICK, GRID_PROPS, LEGEND_STYLE } from '../theme';
import { Card, RichTooltip, KPIStat, KPIStrip } from '../components/primitives';

const TREND_PERIODS = [
  { key: '3m', label: '3개월' },
  { key: '12m', label: '1년' },
  { key: '5y', label: '5년' },
] as const;

interface Props {
  data: TrendsResponse | null;
  loading: boolean;
  period: string;
  setPeriod: (p: string) => void;
  companyName: string;
}

export function InterestTab({ data, loading, period, setPeriod, companyName }: Props) {
  const shortDate = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const googleData = useMemo(() => {
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

  const naverData = useMemo(() => {
    if (!data?.naver.length) return [];
    return data.naver.map((p) => ({ date: shortDate(p.timestamp), value: p.value }));
  }, [data]);

  const xInterval = (len: number) => Math.max(0, Math.floor(len / 8) - 1);

  const gLatest = data?.google.global.at(-1);
  const gPeak = data?.google.global.length
    ? data.google.global.reduce((max, p) => (p.value > max.value ? p : max), data.google.global[0])
    : null;
  const nLatest = data?.naver.at(-1);
  const nPeak = data?.naver.length
    ? data.naver.reduce((max, p) => (p.value > max.value ? p : max), data.naver[0])
    : null;

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 w-40 mb-4 rounded" />
          <div className="h-[300px] bg-gray-100 dark:bg-gray-800/40 rounded-xl" />
        </div>
      </Card>
    );
  }

  if (!googleData.length && !naverData.length) {
    return (
      <Card>
        <p className="font-sans text-sm text-center py-8 text-gray-500">관심도 데이터를 불러올 수 없습니다</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 기간 선택 */}
      <div className="flex items-center justify-between">
        <p className="font-heading text-sm text-gray-500 dark:text-gray-400">
          <span className="font-bold text-[var(--foreground)]">"{companyName}"</span> 검색 관심도
        </p>
        <div className="flex border border-[var(--theme-border-muted)] rounded-lg overflow-hidden">
          {TREND_PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`font-heading text-xs px-3 py-1.5 font-bold transition-all ${
                period === p.key
                  ? 'bg-[var(--theme-accent)] text-white'
                  : 'text-gray-400 hover:text-[var(--foreground)] bg-[var(--theme-bg-card)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <KPIStrip>
        <KPIStat
          label="Google 현재"
          value={`${gLatest?.value ?? '—'}`}
          hint={`/100 · "${data?.keywordEn ?? ''}"`}
        />
        <KPIStat
          label="Google 피크"
          value={`${gPeak?.value ?? '—'}`}
          hint={gPeak ? shortDate(gPeak.timestamp) : '—'}
          valueColor={COLOR.primary}
        />
        <KPIStat
          label="네이버 현재"
          value={`${nLatest?.value ?? '—'}`}
          hint={`/100 · "${companyName}"`}
        />
        <KPIStat
          label="네이버 피크"
          value={`${nPeak?.value ?? '—'}`}
          hint={nPeak ? shortDate(nPeak.timestamp) : '—'}
          valueColor={COLOR.positive}
        />
      </KPIStrip>

      {/* 차트 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {naverData.length > 0 && (
          <Card title="네이버" sub={`"${companyName}" 검색 추이`}>
            <div style={{ height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={naverData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-naver" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLOR.positive} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={COLOR.positive} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis
                    dataKey="date"
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    interval={xInterval(naverData.length)}
                  />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} domain={[0, 100]} width={36} />
                  <Tooltip content={<RichTooltip fmt={(_, v) => `${v} / 100`} />} cursor={{ stroke: COLOR.axisSoft }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="네이버"
                    stroke={COLOR.positive}
                    strokeWidth={2.5}
                    fill="url(#grad-naver)"
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {googleData.length > 0 && (
          <Card title="Google" sub={`"${data?.keywordEn ?? ''}" 글로벌 검색 추이`}>
            <div style={{ height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={googleData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-google" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLOR.primary} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={COLOR.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis
                    dataKey="date"
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    interval={xInterval(googleData.length)}
                  />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} domain={[0, 100]} width={36} />
                  <Tooltip content={<RichTooltip fmt={(_, v) => `${v} / 100`} />} cursor={{ stroke: COLOR.axisSoft }} />
                  <Area
                    type="monotone"
                    dataKey="global"
                    name="Google"
                    stroke={COLOR.primary}
                    strokeWidth={2.5}
                    fill="url(#grad-google)"
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* 글로벌 vs 한국 비교 */}
      {googleData.length > 0 && googleData.some((d) => d.korea !== null) && (
        <Card title="Google: 글로벌 vs 한국" sub="같은 기업, 다른 관심도">
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={googleData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-gvk1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR.primary} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={COLOR.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-gvk2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR.accent} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={COLOR.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis
                  dataKey="date"
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  interval={xInterval(googleData.length)}
                />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} domain={[0, 100]} width={36} />
                <Tooltip content={<RichTooltip fmt={(_, v) => `${v} / 100`} />} cursor={{ stroke: COLOR.axisSoft }} />
                <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="global" name="글로벌" stroke={COLOR.primary} strokeWidth={2} fill="url(#grad-gvk1)" dot={false} isAnimationActive={false} connectNulls />
                <Area type="monotone" dataKey="korea" name="한국" stroke={COLOR.accent} strokeWidth={2} fill="url(#grad-gvk2)" dot={false} isAnimationActive={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
