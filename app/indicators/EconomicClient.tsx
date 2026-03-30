'use client';

import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Brush,
  ReferenceLine,
} from 'recharts';
import type { FredIndicatorConfig, FredObservation, FredApiResponse, TimeRange, EcosIndicatorConfig, Country } from './types';

/* ─── 지표 설정 (미국 FRED) ─── */

const INDICATORS: FredIndicatorConfig[] = [
  {
    seriesId: 'VIXCLS',
    name: 'VIX 공포지수',
    nameEn: 'CBOE Volatility Index',
    description: '시장의 공포와 탐욕을 측정하는 변동성 지수. 20 이하면 안정, 30 이상이면 공포 구간.',
    unit: '',
    color: '#e94560',
    decimals: 2,
  },
  {
    seriesId: 'T10Y2Y',
    name: '장단기 금리차',
    nameEn: '10Y-2Y Treasury Spread',
    description: '10년물과 2년물 국채 금리 차이. 마이너스 전환(역전) 시 경기침체 신호로 해석.',
    unit: '%',
    color: '#f59e0b',
    decimals: 2,
    referenceLine: { value: 0, label: '역전 기준선', color: '#f59e0b' },
  },
  {
    seriesId: 'UNRATE',
    name: '실업률',
    nameEn: 'Unemployment Rate',
    description: '미국 실업률. 경기 과열/침체를 판단하는 가장 기본적인 고용 지표.',
    unit: '%',
    color: '#3b82f6',
    decimals: 1,
  },
  {
    seriesId: 'PCEPI',
    name: 'PCE 물가상승률',
    nameEn: 'PCE Price Index (YoY %)',
    description: '연준(Fed)이 가장 중시하는 인플레이션 지표. 전년 대비 변화율로, 연준 목표치는 2%.',
    unit: '%',
    color: '#10b981',
    decimals: 1,
    yoyChange: true,
  },
  {
    seriesId: 'CPIAUCSL',
    name: 'CPI 물가상승률',
    nameEn: 'Consumer Price Index (YoY %)',
    description: '소비자가 체감하는 물가 상승률. 뉴스에서 "물가 X% 올랐다"가 이 수치.',
    unit: '%',
    color: '#8b5cf6',
    decimals: 1,
    yoyChange: true,
  },
  {
    seriesId: 'M2SL',
    name: 'M2 통화량',
    nameEn: 'M2 Money Supply',
    description: '시중에 풀린 돈의 총량. 증가하면 유동성 확대(돈풀기), 감소하면 긴축.',
    unit: '',
    color: '#06b6d4',
    decimals: 1,
    format: (v: number) => `$${(v / 1000).toFixed(1)}T`,
  },
  {
    seriesId: 'BAA10Y',
    name: 'Baa 크레딧 스프레드',
    nameEn: "Moody's Baa Corporate Bond - 10Y Treasury Spread",
    description: 'Baa등급(투자적격 최하단) 회사채와 10년 국채 금리 차이. 평소 2% 내외, 3% 이상이면 주의, 5% 이상이면 위기 수준.',
    unit: '%',
    color: '#ef4444',
    decimals: 2,
  },
  {
    seriesId: 'AAA10Y',
    name: 'Aaa 크레딧 스프레드',
    nameEn: "Moody's Aaa Corporate Bond - 10Y Treasury Spread",
    description: '최우량(Aaa) 회사채와 10년 국채 금리 차이. Baa보다 안정적이나, 이것마저 벌어지면 심각한 금융 불안 신호.',
    unit: '%',
    color: '#f97316',
    decimals: 2,
  },
];

/* ─── 지표 설정 (한국 ECOS) ─── */

const KR_INDICATORS: EcosIndicatorConfig[] = [
  {
    statCode: '901Y009',
    cycle: 'M',
    name: '소비자물가지수 (CPI)',
    nameEn: 'Consumer Price Index',
    description: '소비자가 체감하는 물가 수준. 전년 대비 상승률이 한은 목표치(2%)를 크게 벗어나면 금리 조정 신호.',
    unit: '',
    color: '#8b5cf6',
    decimals: 1,
    yoyChange: true,
    format: (v: number) => `${v.toFixed(1)}%`,
  },
  {
    statCode: '161Y005',
    cycle: 'M',
    name: 'M2 통화량',
    nameEn: 'M2 Money Supply',
    description: '광의통화(M2). 시중 유동성의 크기를 나타내며, 급증 시 인플레이션 압력.',
    unit: '',
    color: '#06b6d4',
    decimals: 1,
    format: (v: number) => `${(v / 10000).toFixed(0)}조원`,
  },
  {
    statCode: '404Y015',
    cycle: 'M',
    name: '생산자물가지수 (PPI)',
    nameEn: 'Producer Price Index',
    description: '기업이 생산한 상품의 출하 시점 가격. CPI의 선행 지표로, PPI 상승 → 소비자물가 상승 압력.',
    unit: '',
    color: '#a855f7',
    decimals: 1,
    yoyChange: true,
    format: (v: number) => `${v.toFixed(1)}%`,
  },
  {
    statCode: '301Y017',
    cycle: 'M',
    name: '경상수지',
    nameEn: 'Current Account Balance',
    description: '무역·서비스·소득 수지의 합계. 흑자가 지속되면 원화 강세 요인, 적자 전환 시 경고 신호.',
    unit: '',
    color: '#14b8a6',
    decimals: 0,
    format: (v: number) => `${(v / 100).toFixed(1)}억달러`,
  },
  {
    statCode: '901Y062',
    cycle: 'M',
    name: '주택매매가격지수',
    nameEn: 'Housing Price Index (KB)',
    description: 'KB부동산에서 집계하는 전국 주택매매가격지수. 부동산 시장의 과열·침체를 판단하는 핵심 지표.',
    unit: '',
    color: '#f43f5e',
    decimals: 1,
  },
  {
    statCode: '511Y002',
    cycle: 'M',
    name: '소비자심리지수 (CSI)',
    nameEn: 'Consumer Sentiment Index',
    description: '소비자가 느끼는 경기 체감 지수. 100 이상이면 낙관, 100 미만이면 비관. 소비 지출 전망에 직결.',
    unit: '',
    color: '#0ea5e9',
    decimals: 0,
    referenceLine: { value: 100, label: '기준선 (100)', color: '#0ea5e9' },
  },
];

const TIME_RANGES: { key: TimeRange; label: string; days: string; daysNum: number }[] = [
  { key: '1M', label: '1M', days: '30', daysNum: 30 },
  { key: '3M', label: '3M', days: '90', daysNum: 90 },
  { key: '6M', label: '6M', days: '180', daysNum: 180 },
  { key: '1Y', label: '1Y', days: '365', daysNum: 365 },
  { key: '5Y', label: '5Y', days: '1825', daysNum: 1825 },
  { key: 'MAX', label: 'MAX', days: 'max', daysNum: Infinity },
];

/** 분기(Q)/연간(A) 데이터는 짧은 기간이 의미 없으므로 필터 */
function getAvailableRanges(cycle?: string): typeof TIME_RANGES {
  if (cycle === 'Q') return TIME_RANGES.filter(r => ['1Y', '5Y', 'MAX'].includes(r.key));
  if (cycle === 'A') return TIME_RANGES.filter(r => ['5Y', 'MAX'].includes(r.key));
  return TIME_RANGES;
}

const MAX_CHART_POINTS = 300;

/* ─── 클라이언트 캐시 (sessionStorage + 메모리) ─── */

const memoryCache = new Map<string, FredObservation[]>();

function getCacheKey(seriesId: string, days: string) {
  return `fred_${seriesId}_${days}`;
}

function getFromCache(seriesId: string, days: string): FredObservation[] | null {
  // 메모리 캐시 먼저
  const memKey = getCacheKey(seriesId, days);
  const mem = memoryCache.get(memKey);
  if (mem) return mem;

  // sessionStorage 확인
  try {
    const stored = sessionStorage.getItem(memKey);
    if (stored) {
      const parsed = JSON.parse(stored) as FredObservation[];
      memoryCache.set(memKey, parsed);
      return parsed;
    }
  } catch { /* sessionStorage unavailable */ }

  return null;
}

function setToCache(seriesId: string, days: string, data: FredObservation[]) {
  const key = getCacheKey(seriesId, days);
  memoryCache.set(key, data);
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota exceeded or unavailable */ }
}

/** 큰 범위 캐시에서 작은 범위 데이터 추출 */
function sliceByDays(data: FredObservation[], daysNum: number): FredObservation[] {
  if (!isFinite(daysNum)) return data;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysNum);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return data.filter((d) => d.date >= cutoffStr);
}

/** YoY 지표가 사용하는 확장 캐시 키 목록 (원래 일수 + 400) */
const YOY_EXTRA_DAYS = 400;
const ALL_CACHE_DAYS: { days: string; daysNum: number }[] = [
  ...TIME_RANGES,
  // YoY 지표용 확장 범위
  ...TIME_RANGES
    .filter((r) => r.days !== 'max' && isFinite(r.daysNum))
    .map((r) => ({ days: String(r.daysNum + YOY_EXTRA_DAYS), daysNum: r.daysNum + YOY_EXTRA_DAYS })),
];

/** 캐시에서 데이터를 찾되, 더 큰 범위가 있으면 그걸로 잘라서 반환 */
function resolveFromCache(seriesId: string, targetDaysNum: number): FredObservation[] | null {
  // 타겟 범위 이상인 캐시 찾기 (큰 것부터)
  const sortedRanges = [...ALL_CACHE_DAYS].sort((a, b) => b.daysNum - a.daysNum);

  for (const range of sortedRanges) {
    if (range.daysNum < targetDaysNum) continue;
    const cached = getFromCache(seriesId, range.days);
    if (cached && cached.length > 0) {
      return sliceByDays(cached, targetDaysNum);
    }
  }
  return null;
}

/* ─── 다운샘플링 ─── */

function downsample(data: FredObservation[], maxPoints: number): FredObservation[] {
  if (data.length <= maxPoints) return data;
  const step = data.length / maxPoints;
  const result: FredObservation[] = [];
  for (let i = 0; i < maxPoints - 1; i++) {
    result.push(data[Math.floor(i * step)]);
  }
  result.push(data[data.length - 1]);
  return result;
}

/* ─── YoY 변환: 원본 지수 → 전년 대비 변화율(%) ─── */

function toYoYPercent(data: FredObservation[]): FredObservation[] {
  if (data.length < 2) return [];
  const result: FredObservation[] = [];

  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    const currentDate = new Date(current.date);
    const targetDate = new Date(currentDate);
    targetDate.setFullYear(targetDate.getFullYear() - 1);

    // 1년 전 데이터 포인트 찾기 (가장 가까운 것)
    let closest: FredObservation | null = null;
    let minDiff = Infinity;
    for (let j = 0; j < i; j++) {
      const diff = Math.abs(new Date(data[j].date).getTime() - targetDate.getTime());
      // 45일 이내만 허용 (월간 데이터 기준)
      if (diff < minDiff && diff < 45 * 24 * 60 * 60 * 1000) {
        minDiff = diff;
        closest = data[j];
      }
    }

    if (closest && closest.value !== 0) {
      const yoy = ((current.value - closest.value) / closest.value) * 100;
      result.push({ date: current.date, value: parseFloat(yoy.toFixed(2)) });
    }
  }

  return result;
}

/* ─── Intersection Observer 훅 ─── */

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

/* ─── 차트 축 폰트 ─── */

const AXIS_FONT = { fontFamily: 'var(--font-body), Inter, sans-serif', fontWeight: 700 };

/* ─── 커스텀 툴팁 ─── */

const ChartTooltip = memo(function ChartTooltip({ active, payload, label, config }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  config: FredIndicatorConfig | EcosIndicatorConfig;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  const formatted = config.format ? config.format(value) : `${value.toFixed(config.decimals)}${config.unit}`;

  return (
    <div
      className="bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border)] px-3 py-2"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <p className="font-heading text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="font-heading text-sm font-bold text-[var(--foreground)]">{formatted}</p>
    </div>
  );
});

/* ─── 로딩 스켈레톤 ─── */

function SkeletonCard() {
  return (
    <div className="card-base p-5 sm:p-7">
      <div className="animate-pulse space-y-4">
        <div className="flex justify-between">
          <div className="space-y-2">
            <div className="h-5 w-32 bg-[var(--theme-border-muted)]/30 rounded-sm" />
            <div className="h-4 w-44 bg-[var(--theme-border-muted)]/20 rounded-sm" />
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-7 w-8 bg-[var(--theme-border-muted)]/20 rounded-sm" />
            ))}
          </div>
        </div>
        <div className="h-4 w-full bg-[var(--theme-border-muted)]/15 rounded-sm" />
        <div className="h-[300px] bg-[var(--theme-border-muted)]/10 rounded-sm" />
      </div>
    </div>
  );
}

/* ─── 지표 카드 ─── */

const IndicatorCard = memo(function IndicatorCard({
  config,
  apiType = 'fred',
}: {
  config: FredIndicatorConfig | EcosIndicatorConfig;
  apiType?: 'fred' | 'ecos';
}) {
  const { ref, inView } = useInView();
  const defaultRange = apiType === 'ecos' && (config as EcosIndicatorConfig).cycle === 'Q' ? '5Y'
    : apiType === 'ecos' && (config as EcosIndicatorConfig).cycle === 'A' ? '5Y' : '1Y';
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultRange as TimeRange);
  const [rawData, setRawData] = useState<FredObservation[]>([]);
  const [loading, setLoading] = useState(true);

  // 측정선 상태
  const [measureEnabled, setMeasureEnabled] = useState(false);
  const [measureValue, setMeasureValue] = useState<number>(0);
  const [measureInput, setMeasureInput] = useState<string>('');
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // 지표 ID (FRED: seriesId, ECOS: statCode)
  const configId = apiType === 'fred' ? (config as FredIndicatorConfig).seriesId : (config as EcosIndicatorConfig).statCode;
  const configCycle = apiType === 'ecos' ? (config as EcosIndicatorConfig).cycle : undefined;

  const availableRanges = useMemo(() => getAvailableRanges(configCycle), [configCycle]);
  const currentRange = availableRanges.find((r) => r.key === timeRange) || availableRanges[availableRanges.length - 2] || availableRanges[0];

  const fetchData = useCallback(async (range: typeof TIME_RANGES[number]) => {
    // YoY 지표: 실제 API 요청 일수 (변환에 필요한 추가 기간 포함)
    const needsExtra = config.yoyChange && range.days !== 'max';
    const actualDays = needsExtra ? String(range.daysNum + YOY_EXTRA_DAYS) : range.days;
    const actualDaysNum = needsExtra ? range.daysNum + YOY_EXTRA_DAYS : range.daysNum;

    // 캐시에서 찾기 (더 큰 범위 포함)
    const cached = resolveFromCache(configId, actualDaysNum);
    if (cached) {
      if (config.yoyChange) {
        const yoyData = toYoYPercent(cached);
        setRawData(sliceByDays(yoyData, range.daysNum));
      } else {
        setRawData(cached);
      }
      setLoading(false);
      return;
    }

    // 캐시 없으면 API 호출
    setLoading(true);
    try {
      let url: string;
      if (apiType === 'ecos') {
        url = `/api/ecos?stat_code=${configId}&cycle=${configCycle}&limit=${actualDays}`;
      } else {
        url = `/api/fred?series_id=${configId}&limit=${actualDays}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      const data: FredObservation[] = json.observations;

      // 원본 데이터를 캐시에 저장
      setToCache(configId, actualDays, data);

      if (config.yoyChange) {
        const yoyData = toYoYPercent(data);
        setRawData(sliceByDays(yoyData, range.daysNum));
      } else {
        setRawData(data);
      }
    } catch {
      setRawData([]);
    } finally {
      setLoading(false);
    }
  }, [configId, configCycle, config.yoyChange, apiType]);

  // 화면에 보일 때 첫 fetch
  useEffect(() => {
    if (inView) {
      fetchData(currentRange);
    }
  }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps

  // 기간 변경
  const handleRangeChange = useCallback((key: TimeRange) => {
    setTimeRange(key);
    const range = availableRanges.find((r) => r.key === key)!;
    fetchData(range);
  }, [fetchData, availableRanges]);

  // 차트용 다운샘플링
  const observations = useMemo(() => downsample(rawData, MAX_CHART_POINTS), [rawData]);

  const latest = rawData[rawData.length - 1];
  const previous = rawData.length > 1 ? rawData[rawData.length - 2] : null;
  const change = latest && previous ? latest.value - previous.value : 0;

  const latestFormatted = latest
    ? config.format
      ? config.format(latest.value)
      : `${latest.value.toFixed(config.decimals)}${config.unit}`
    : '-';

  const formatXAxis = useCallback((date: string) => {
    const d = new Date(date);
    if (timeRange === '1M' || timeRange === '3M') {
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
    if (timeRange === '5Y' || timeRange === 'MAX') {
      return `${d.getFullYear()}`;
    }
    const month = d.toLocaleString('en', { month: 'short' });
    return `${month} ${d.getFullYear().toString().slice(2)}`;
  }, [timeRange]);

  const wideYAxis = ['M2SL', '101Y018', '301Y017', '161Y005'].includes(configId);
  const yAxisWidth = wideYAxis ? 72 : 48;
  const tickInterval = Math.max(1, Math.floor(observations.length / 6) - 1);
  const showBrush = observations.length > 30;

  const formatMeasureValue = useCallback((val: number) => {
    return config.format
      ? config.format(val)
      : `${val.toFixed(config.decimals)}${config.unit}`;
  }, [config.format, config.decimals, config.unit]);

  // 데이터 min/max (측정선 드래그용 value↔pixel 매핑)
  const yRange = useMemo((): [number, number] => {
    if (observations.length === 0) return [0, 1];
    const values = observations.map(d => d.value);
    return [Math.min(...values), Math.max(...values)];
  }, [observations]);

  // 측정값 + 입력필드 동기화
  const updateMeasure = useCallback((val: number) => {
    setMeasureValue(val);
    setMeasureInput(val.toFixed(config.decimals));
  }, [config.decimals]);

  // 측정선 토글
  const toggleMeasure = useCallback(() => {
    if (measureEnabled) {
      setMeasureEnabled(false);
    } else {
      setMeasureEnabled(true);
      if (observations.length > 0) {
        updateMeasure((yRange[0] + yRange[1]) / 2);
      }
    }
  }, [measureEnabled, observations, yRange, updateMeasure]);

  // 차트 영역에서 마우스 Y → 값 변환 (측정 모드 드래그용)
  const chartHeight = showBrush ? 360 : 300;
  const plotTop = 5; // margin.top
  const plotBottom = chartHeight - (showBrush ? 35 : 0); // brush 영역 제외

  const pixelToValue = useCallback((relY: number) => {
    const ratio = (relY - plotTop) / (plotBottom - plotTop);
    const clamped = Math.max(0, Math.min(1, ratio));
    // Y축은 위가 max, 아래가 min
    return yRange[1] - clamped * (yRange[1] - yRange[0]);
  }, [yRange, plotTop, plotBottom]);

  // 측정 모드 드래그 (차트 위 오버레이에서)
  const handleMeasureStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const container = chartContainerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    // 첫 클릭 위치로 즉시 이동
    updateMeasure(pixelToValue(clientY - containerRect.top));

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const cy = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
      updateMeasure(pixelToValue(cy - containerRect.top));
    };

    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }, [pixelToValue]);

  return (
    <div
      ref={ref}
      className="card-base p-5 sm:p-7 transition-[border-color] duration-200 hover:border-[var(--theme-accent)]"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      {/* 헤더 + 기간 버튼 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--foreground)] tracking-wide">
              {config.name}
            </h3>
            {latest && (
              <span className="font-heading text-xl sm:text-2xl font-bold text-[var(--foreground)]">
                {latestFormatted}
              </span>
            )}
            {previous && (
              <span
                className={`font-heading text-xs sm:text-sm font-bold ${
                  change >= 0 ? 'text-red-500' : 'text-blue-500'
                }`}
              >
                {change >= 0 ? '▲' : '▼'}{' '}
                {config.format
                  ? config.format(Math.abs(change))
                  : `${Math.abs(change).toFixed(config.decimals)}${config.unit}`}
              </span>
            )}
          </div>
          <p className="font-heading text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">
            {config.nameEn}
          </p>
        </div>

        {/* 기간 선택 버튼 + 측정 토글 */}
        <div className="flex gap-1 flex-shrink-0 items-center">
          {availableRanges.map((range) => (
            <button
              key={range.key}
              onClick={() => handleRangeChange(range.key)}
              disabled={loading}
              className={`font-heading text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 font-bold border-2 transition-colors duration-100
                ${
                  timeRange === range.key
                    ? 'bg-[var(--theme-accent)] text-white border-[var(--theme-accent-dark)]'
                    : 'bg-[var(--theme-bg-card)] text-gray-500 dark:text-gray-400 border-[var(--theme-border-muted)] hover:border-[var(--theme-accent)] hover:text-[var(--foreground)]'
                }
                ${loading ? 'opacity-50 cursor-wait' : ''}`}
            >
              {range.label}
            </button>
          ))}
          <button
            onClick={toggleMeasure}
            disabled={loading || observations.length === 0}
            className={`font-heading text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 font-bold border-2 transition-colors duration-100 ml-1
              ${
                measureEnabled
                  ? 'bg-[var(--theme-accent)] text-white border-[var(--theme-accent-dark)]'
                  : 'bg-[var(--theme-bg-card)] text-gray-500 dark:text-gray-400 border-[var(--theme-border-muted)] hover:border-[var(--theme-accent)] hover:text-[var(--foreground)]'
              }`}
          >
            측정
          </button>
          {measureEnabled && (
            <input
              type="text"
              inputMode="decimal"
              value={measureInput}
              onFocus={() => setMeasureInput(measureValue.toFixed(config.decimals))}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '' || raw === '-' || raw === '.' || raw === '-.') {
                  setMeasureInput(raw);
                  return;
                }
                if (/^-?\d*\.?\d*$/.test(raw)) {
                  setMeasureInput(raw);
                  const val = parseFloat(raw);
                  if (!isNaN(val)) {
                    setMeasureValue(Math.max(yRange[0], Math.min(yRange[1], val)));
                  }
                }
              }}
              onBlur={() => {
                const val = parseFloat(measureInput);
                if (isNaN(val) || measureInput === '') {
                  updateMeasure(0);
                } else {
                  updateMeasure(Math.max(yRange[0], Math.min(yRange[1], val)));
                }
              }}
              className="font-mono text-[11px] sm:text-xs w-20 sm:w-24 px-2 py-1 sm:py-1.5 ml-1 border-2 border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)] text-[var(--foreground)] font-bold focus:border-[var(--theme-accent)] focus:outline-none transition-colors"
              title="측정선 수치 직접 입력"
            />
          )}
        </div>
      </div>

      {/* 설명 */}
      <p className="font-heading text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
        {config.description}
      </p>

      {/* 차트 */}
      {!inView || loading ? (
        <div className="animate-pulse h-[300px] bg-[var(--theme-border-muted)]/10 rounded-sm" />
      ) : observations.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center">
          <p className="font-heading text-sm font-bold text-gray-400">데이터를 불러올 수 없습니다.</p>
        </div>
      ) : (
        <div
          ref={chartContainerRef}
          style={{
            height: chartHeight,
            position: 'relative',
          }}
        >
          <ResponsiveContainer>
            <AreaChart data={observations} margin={{ top: 5, right: 5, left: 0, bottom: showBrush ? 5 : 0 }}>
              <defs>
                <linearGradient id={`gradient-${configId}-${timeRange}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--theme-border-muted)"
                opacity={0.4}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, ...AXIS_FONT, fill: 'var(--foreground)' }}
                tickLine={{ stroke: 'var(--theme-border-muted)' }}
                axisLine={{ stroke: 'var(--theme-border-muted)', strokeWidth: 2 }}
                tickFormatter={formatXAxis}
                interval={tickInterval}
              />
              <YAxis
                tick={{ fontSize: 12, ...AXIS_FONT, fill: 'var(--foreground)' }}
                tickLine={{ stroke: 'var(--theme-border-muted)' }}
                axisLine={{ stroke: 'var(--theme-border-muted)', strokeWidth: 2 }}
                width={yAxisWidth}
                tickFormatter={(v: number) =>
                  config.format ? config.format(v) : `${v}`
                }
                domain={['auto', 'auto']}
              />
              <Tooltip content={<ChartTooltip config={config} />} />
              {config.referenceLine && (
                <ReferenceLine
                  y={config.referenceLine.value}
                  stroke={config.referenceLine.color}
                  strokeWidth={config.referenceLine.strokeWidth ?? 1.5}
                  label={{
                    value: config.referenceLine.label,
                    position: 'right',
                    fill: config.referenceLine.color,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'var(--font-body), Inter, sans-serif',
                  }}
                />
              )}
              {/* 측정선: recharts ReferenceLine → 차트 안에서만 표시 + 왼쪽에 숫자 */}
              {measureEnabled && (
                <ReferenceLine
                  y={measureValue}
                  stroke={config.color}
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  strokeOpacity={0.7}
                  ifOverflow="hidden"
                  label={{
                    value: formatMeasureValue(measureValue),
                    position: 'left',
                    fill: config.color,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'var(--font-body), Inter, sans-serif',
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke={config.color}
                strokeWidth={2}
                fill={`url(#gradient-${configId}-${timeRange})`}
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: config.color,
                  strokeWidth: 2,
                  fill: 'var(--theme-bg-card)',
                }}
                isAnimationActive={false}
              />
              {showBrush && (
                <Brush
                  dataKey="date"
                  height={30}
                  stroke="var(--theme-accent)"
                  fill="var(--theme-bg)"
                  travellerWidth={10}
                  tickFormatter={formatXAxis}
                >
                  <AreaChart>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={config.color}
                      fill={config.color}
                      fillOpacity={0.15}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </Brush>
              )}
            </AreaChart>
          </ResponsiveContainer>

          {/* 측정 모드: 차트 위 투명 오버레이 (클릭+드래그로 선 이동) */}
          {measureEnabled && (
            <div
              onMouseDown={handleMeasureStart}
              onTouchStart={handleMeasureStart}
              style={{
                position: 'absolute',
                top: 0,
                left: yAxisWidth,
                right: 0,
                bottom: showBrush ? 35 : 0,
                cursor: 'ns-resize',
                zIndex: 15,
                touchAction: 'none',
              }}
            />
          )}
        </div>
      )}

      {/* 마지막 업데이트 */}
      {latest && !loading && (
        <p className="font-heading text-xs font-bold text-gray-400 dark:text-gray-500 mt-2 text-right">
          최종 데이터: {latest.date}
        </p>
      )}
    </div>
  );
});

/* ─── 메인 컴포넌트 ─── */

const COUNTRY_INFO = {
  US: {
    subtitle: 'FRED 데이터로 보는 미국 핵심 매크로 지표',
    detail: 'VIX 공포지수, 장단기금리차, 실업률, PCE, CPI, M2 통화량까지.\n투자 판단에 필요한 거시경제 데이터를 한눈에 확인하세요.',
    source: 'Federal Reserve Economic Data (FRED), Federal Reserve Bank of St. Louis',
    notice: 'This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.',
  },
  KR: {
    subtitle: 'ECOS 데이터로 보는 한국 핵심 매크로 지표',
    detail: '기준금리, 국고채, 실업률, CPI, GDP, M2, 원/달러 환율까지.\n한국 경제의 흐름을 한눈에 확인하세요.',
    source: '자료: 한국은행 경제통계시스템(ECOS)',
    notice: '본 서비스는 한국은행 Open API를 활용하며, 한국은행의 공식 인증을 받은 서비스가 아닙니다.',
  },
};

export default function EconomicClient() {
  const [country, setCountry] = useState<Country>('US');
  const info = COUNTRY_INFO[country];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* 히어로 섹션 */}
      <section
        className="mb-6 sm:mb-8 bg-ant-red-950 dark:bg-ant-red-950 border-2 border-[var(--theme-border)] p-6 sm:p-8 relative overflow-hidden"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="relative z-10 text-center">
          <div className="inline-block mb-2 sm:mb-3 px-4 py-1.5 border-2 border-ant-red-600 dark:border-ant-red-400 bg-ant-red-50 dark:bg-ant-red-950/30">
            <span className="font-heading text-xs font-bold tracking-widest text-ant-red-600 dark:text-ant-red-400 uppercase">
              Economic Dashboard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-1.5 sm:mb-2 tracking-tight leading-tight text-shadow-md">
            경제 지표
          </h1>

          {/* 미국 / 한국 토글 */}
          <div className="flex justify-center gap-2 mt-3 sm:mt-4 mb-3 sm:mb-4">
            <button
              onClick={() => setCountry('US')}
              className={`font-heading text-sm sm:text-base px-5 sm:px-6 py-2 sm:py-2.5 font-bold border-2 transition-all duration-150 ${
                country === 'US'
                  ? 'bg-white text-ant-red-950 border-white shadow-[2px_2px_0px_rgba(0,0,0,0.3)]'
                  : 'bg-transparent text-gray-300 border-gray-500 hover:border-gray-300 hover:text-white'
              }`}
            >
              미국
            </button>
            <button
              onClick={() => setCountry('KR')}
              className={`font-heading text-sm sm:text-base px-5 sm:px-6 py-2 sm:py-2.5 font-bold border-2 transition-all duration-150 ${
                country === 'KR'
                  ? 'bg-white text-ant-red-950 border-white shadow-[2px_2px_0px_rgba(0,0,0,0.3)]'
                  : 'bg-transparent text-gray-300 border-gray-500 hover:border-gray-300 hover:text-white'
              }`}
            >
              한국
            </button>
          </div>

          <p className="font-heading text-sm sm:text-base font-bold text-ant-red-300 tracking-wide">
            {info.subtitle}
          </p>
          <p className="font-heading text-xs sm:text-sm text-gray-400 mt-2 sm:mt-3 max-w-xl mx-auto leading-relaxed whitespace-pre-line">
            {info.detail}
          </p>
        </div>
      </section>

      {/* 지표 목록 */}
      <section className="space-y-4 sm:space-y-6 mb-8 sm:mb-12">
        {country === 'US'
          ? INDICATORS.map((config) => (
              <IndicatorCard key={config.seriesId} config={config} apiType="fred" />
            ))
          : KR_INDICATORS.map((config) => (
              <IndicatorCard key={config.statCode} config={config} apiType="ecos" />
            ))
        }
      </section>

      {/* 출처 표기 */}
      <section
        className="p-5 sm:p-6 bg-pixel-card border-2 border-[var(--theme-border-muted)] border-l-ant-red-600 dark:border-l-ant-red-400"
        style={{ borderLeftWidth: '6px', boxShadow: 'var(--shadow-md)' }}
      >
        <p className="font-heading text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
          {info.notice}
        </p>
        <p className="font-heading text-xs font-medium text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
          데이터 출처: {info.source}
        </p>
      </section>
    </div>
  );
}
