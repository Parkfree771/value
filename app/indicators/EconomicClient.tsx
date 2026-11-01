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
  ReferenceLine,
} from 'recharts';
import type { FredIndicatorConfig, FredObservation, FredApiResponse, TimeRange, EcosIndicatorConfig, Country } from './types';
import TrendIcon from '@/components/TrendIcon';

/* ─── 지표 설정 (미국 FRED) ─── */

const INDICATORS: FredIndicatorConfig[] = [
  {
    seriesId: 'VIXCLS',
    name: 'VIX 공포지수',
    nameEn: 'CBOE Volatility Index',
    description: '시장의 공포와 탐욕을 측정하는 변동성 지수. 20 이하면 안정, 30 이상이면 공포 구간.',
    unit: '',
    decimals: 2,
  },
  {
    seriesId: 'T10Y2Y',
    name: '장단기 금리차',
    nameEn: '10Y-2Y Treasury Spread',
    description: '10년물과 2년물 국채 금리 차이. 마이너스 전환(역전) 시 경기침체 신호로 해석.',
    unit: '%',
    decimals: 2,
    referenceLine: { value: 0, label: '역전 기준선' },
  },
  {
    seriesId: 'UNRATE',
    name: '실업률',
    nameEn: 'Unemployment Rate',
    description: '미국 실업률. 경기 과열/침체를 판단하는 가장 기본적인 고용 지표.',
    unit: '%',
    decimals: 1,
  },
  {
    seriesId: 'PCEPI',
    name: 'PCE 물가상승률',
    nameEn: 'PCE Price Index (YoY %)',
    description: '연준(Fed)이 가장 중시하는 인플레이션 지표. 전년 대비 변화율로, 연준 목표치는 2%.',
    unit: '%',
    decimals: 1,
    yoyChange: true,
  },
  {
    seriesId: 'CPIAUCSL',
    name: 'CPI 물가상승률',
    nameEn: 'Consumer Price Index (YoY %)',
    description: '소비자가 체감하는 물가 상승률. 뉴스에서 "물가 X% 올랐다"가 이 수치.',
    unit: '%',
    decimals: 1,
    yoyChange: true,
  },
  {
    seriesId: 'M2SL',
    name: 'M2 통화량',
    nameEn: 'M2 Money Supply',
    description: '시중에 풀린 돈의 총량. 증가하면 유동성 확대(돈풀기), 감소하면 긴축.',
    unit: '',
    decimals: 1,
    format: (v: number) => `$${(v / 1000).toFixed(1)}T`,
  },
  {
    seriesId: 'BAA10Y',
    name: 'Baa 크레딧 스프레드',
    nameEn: "Moody's Baa Corporate Bond - 10Y Treasury Spread",
    description: 'Baa등급(투자적격 최하단) 회사채와 10년 국채 금리 차이. 평소 2% 내외, 3% 이상이면 주의, 5% 이상이면 위기 수준.',
    unit: '%',
    decimals: 2,
  },
  {
    seriesId: 'AAA10Y',
    name: 'Aaa 크레딧 스프레드',
    nameEn: "Moody's Aaa Corporate Bond - 10Y Treasury Spread",
    description: '최우량(Aaa) 회사채와 10년 국채 금리 차이. Baa보다 안정적이나, 이것마저 벌어지면 심각한 금융 불안 신호.',
    unit: '%',
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
    decimals: 1,
  },
  {
    statCode: '511Y002',
    cycle: 'M',
    name: '소비자심리지수 (CSI)',
    nameEn: 'Consumer Sentiment Index',
    description: '소비자가 느끼는 경기 체감 지수. 100 이상이면 낙관, 100 미만이면 비관. 소비 지출 전망에 직결.',
    unit: '',
    decimals: 0,
    referenceLine: { value: 100, label: '기준선 (100)' },
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

const AXIS_TICK = { fontSize: 11, fill: 'var(--theme-ink-soft)' };
const AXIS_FONT = 'var(--font-body), Inter, sans-serif';

// 차트 색은 사이트 포인트색 하나
const LINE_COLOR = 'var(--theme-orange)';
const GUIDE_COLOR = 'var(--theme-ink-soft)';
const CHART_HEIGHT = 240;
const X_AXIS_HEIGHT = 30;

const TAB_ACTIVE = 'font-bold text-[var(--foreground)] border-b-2 border-[var(--theme-border)]';
const TAB_INACTIVE = 'text-[var(--theme-ink-soft)] hover:text-[var(--foreground)] border-b-2 border-transparent';

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
    <div className="bg-[var(--background)] border border-[var(--theme-border)] px-3 py-2">
      <p className="text-xs text-[var(--theme-ink-soft)]">{label}</p>
      <p className="font-mono text-sm font-bold tabular-nums">{formatted}</p>
    </div>
  );
});

/* ─── 지표 한 칸 ─── */

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
  const [releasedAt, setReleasedAt] = useState<string | null>(null);
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
      if (json.releasedAt) setReleasedAt(json.releasedAt);

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
  const plotTop = 5; // margin.top
  const plotBottom = CHART_HEIGHT - X_AXIS_HEIGHT;

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
    <article ref={ref} className="min-w-0">
      {/* 지표 이름 + 기간 */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-2 border-[var(--theme-border)] pb-1.5">
        <h2 className="headline text-[20px] leading-tight" title={config.nameEn}>{config.name}</h2>
        <div className="flex items-center gap-2.5 text-xs">
          {availableRanges.map((range) => (
            <button
              key={range.key}
              onClick={() => handleRangeChange(range.key)}
              disabled={loading}
              aria-pressed={timeRange === range.key}
              className={`pb-0.5 ${timeRange === range.key ? TAB_ACTIVE : TAB_INACTIVE} ${loading ? 'opacity-50 cursor-wait' : ''}`}
            >
              {range.label}
            </button>
          ))}
          <button
            onClick={toggleMeasure}
            disabled={loading || observations.length === 0}
            aria-pressed={measureEnabled}
            className={`ml-1 pb-0.5 ${measureEnabled ? TAB_ACTIVE : TAB_INACTIVE}`}
          >
            측정
          </button>
        </div>
      </div>

      {/* 최신 값 */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[30px] font-black leading-none tabular-nums">{latest ? latestFormatted : '—'}</span>
        {previous && (
          <span className={`font-mono text-sm font-bold tabular-nums ${change >= 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}`}>
            <TrendIcon direction={change >= 0 ? 'up' : 'down'} />{' '}
            {config.format ? config.format(Math.abs(change)) : `${Math.abs(change).toFixed(config.decimals)}${config.unit}`}
          </span>
        )}
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
            className="ml-auto w-24 border-b border-[var(--theme-border)] bg-transparent px-1 py-0.5 text-right font-mono text-xs font-bold focus:outline-none"
            aria-label="측정선 수치"
            title="측정선 수치 직접 입력"
          />
        )}
      </div>

      <p className="mt-2 min-h-[2.75em] text-[13px] leading-relaxed text-[var(--theme-ink-soft)] break-keep">{config.description}</p>

      {/* 차트 */}
      <div className="mt-2" style={{ height: CHART_HEIGHT }}>
        {!inView || loading ? (
          <div className="h-full animate-pulse bg-[var(--theme-border-muted)]/10" />
        ) : observations.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-[var(--theme-ink-soft)]">데이터를 불러올 수 없습니다.</p>
        ) : (
          <div ref={chartContainerRef} className="relative h-full">
            <ResponsiveContainer>
              <AreaChart data={observations} margin={{ top: plotTop, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${configId}-${timeRange}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" style={{ stopColor: LINE_COLOR, stopOpacity: 0.18 }} />
                    <stop offset="95%" style={{ stopColor: LINE_COLOR, stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--theme-border-muted)" />
                <XAxis
                  dataKey="date"
                  height={X_AXIS_HEIGHT}
                  tick={AXIS_TICK}
                  fontFamily={AXIS_FONT}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--theme-border-muted)' }}
                  tickFormatter={formatXAxis}
                  interval={tickInterval}
                />
                <YAxis
                  tick={AXIS_TICK}
                  fontFamily={AXIS_FONT}
                  tickLine={false}
                  axisLine={false}
                  width={yAxisWidth}
                  tickFormatter={(v: number) => (config.format ? config.format(v) : `${v}`)}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<ChartTooltip config={config} />} cursor={{ stroke: 'var(--theme-border)', strokeWidth: 1 }} />
                {config.referenceLine && (
                  <ReferenceLine
                    y={config.referenceLine.value}
                    stroke={GUIDE_COLOR}
                    strokeDasharray="3 3"
                    label={{
                      value: config.referenceLine.label,
                      position: 'insideTopRight',
                      fill: GUIDE_COLOR,
                      fontSize: 11,
                      fontFamily: AXIS_FONT,
                    }}
                  />
                )}
                {/* 측정선: 차트 안에서만 표시 + 왼쪽에 숫자 */}
                {measureEnabled && (
                  <ReferenceLine
                    y={measureValue}
                    stroke="var(--foreground)"
                    strokeDasharray="6 4"
                    ifOverflow="hidden"
                    label={{
                      value: formatMeasureValue(measureValue),
                      position: 'insideTopLeft',
                      fill: 'var(--foreground)',
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: AXIS_FONT,
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={LINE_COLOR}
                  strokeWidth={1.75}
                  fill={`url(#gradient-${configId}-${timeRange})`}
                  dot={false}
                  activeDot={{ r: 4, stroke: LINE_COLOR, strokeWidth: 2, fill: 'var(--background)' }}
                  isAnimationActive={false}
                />
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
                  bottom: X_AXIS_HEIGHT,
                  cursor: 'ns-resize',
                  zIndex: 15,
                  touchAction: 'none',
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* 데이터 기준일 */}
      <p className="mt-1 min-h-[1.25em] text-right text-[11px] tabular-nums text-[var(--theme-ink-soft)]">
        {latest && !loading && (
          <>
            {latest.date} 기준{releasedAt && ` · ${releasedAt.slice(0, 10)} 발표`}
          </>
        )}
      </p>
    </article>
  );
});

/* ─── 메인 컴포넌트 ─── */

const COUNTRY_LABEL: Record<Country, string> = { US: '미국', KR: '한국' };
const COUNTRIES = Object.keys(COUNTRY_LABEL) as Country[];

const COUNTRY_INFO: Record<Country, { deck: string; source: string; notice: string }> = {
  US: {
    deck: '공포지수와 금리차, 물가, 고용, 통화량, 크레딧 스프레드로 미국 경기를 읽습니다.',
    source: 'Federal Reserve Economic Data (FRED), Federal Reserve Bank of St. Louis',
    notice: 'This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.',
  },
  KR: {
    deck: '물가와 통화량, 경상수지, 주택가격, 소비심리로 한국 경기를 읽습니다.',
    source: '한국은행 경제통계시스템(ECOS)',
    notice: '본 서비스는 한국은행 Open API를 활용하며, 한국은행의 공식 인증을 받은 서비스가 아닙니다.',
  },
};

export default function EconomicClient() {
  const [country, setCountry] = useState<Country>('US');
  const info = COUNTRY_INFO[country];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-2 border-[var(--theme-border)] pb-3">
        <div>
          <h1 className="headline text-[32px] sm:text-[40px] leading-tight">경제지표</h1>
          <p className="mt-1 text-sm text-[var(--theme-ink-soft)] break-keep">{info.deck}</p>
        </div>
        <div className="flex items-center gap-4">
          {COUNTRIES.map((c) => (
            <button
              key={c}
              onClick={() => setCountry(c)}
              aria-pressed={country === c}
              className={`pb-0.5 text-[15px] ${country === c ? TAB_ACTIVE : TAB_INACTIVE}`}
            >
              {COUNTRY_LABEL[c]}
            </button>
          ))}
        </div>
      </header>

      {/* 지표 — 2단 지면 */}
      <section aria-label={`${COUNTRY_LABEL[country]} 경제지표`} className="mt-7 grid gap-x-10 gap-y-9 lg:grid-cols-2">
        {country === 'US'
          ? INDICATORS.map((config) => <IndicatorCard key={config.seriesId} config={config} apiType="fred" />)
          : KR_INDICATORS.map((config) => <IndicatorCard key={config.statCode} config={config} apiType="ecos" />)}
      </section>

      <footer className="mt-12 border-t-2 border-[var(--theme-border)] pt-3 text-xs leading-relaxed text-[var(--theme-ink-soft)]">
        <p>데이터 출처: {info.source}</p>
        <p className="mt-1">{info.notice}</p>
      </footer>
    </div>
  );
}
