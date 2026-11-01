'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { hierarchy, treemap } from 'd3-hierarchy';
import { PortfolioHolding } from '@/lib/sec13f/types';
import { formatUsd } from '@/lib/sec13f/format';

type StatusKr = '신규매수' | '비중확대' | '유지' | '비중축소';

interface Cell {
  ticker: string;
  name: string;
  weight: number;
  marketValue: string;
  status: StatusKr;
  change: number | null; // 툴팁 변동% 표시용 (shares_change_pct, NEW BUY는 null)
  deltaWeight: number; // |weight_curr - weight_prev| (%p) — 셰이드 강도 통일 metric
}

const STATUS_MAP: Record<PortfolioHolding['status'], StatusKr | null> = {
  'NEW BUY': '신규매수',
  'ADD': '비중확대',
  'HOLD': '유지',
  'TRIM': '비중축소',
  'SOLD OUT': null,
};

// 연속 heat map — Finviz/네이버 시총맵 스타일.
// 매수=빨강, 매도=파랑, 유지=회색. Δweight 부호+절댓값으로 연속 그라데이션.
// sqrt 매핑으로 작은 Δw도 시각적 의미가 살아남. 1.5pp+ 면 최대 채도.
// 텍스트는 HSL lightness 기반으로 흰/검 자동 스왑.
const MAX_DELTA = 1.5;

function getCellColors(
  deltaWeight: number,
  status: StatusKr,
  isDark: boolean
): { fill: string; text: string } {
  // 중립 (유지 or 거의 변동 없음)
  if (status === '유지' || Math.abs(deltaWeight) < 0.05) {
    return isDark
      ? { fill: 'hsl(0, 0%, 22%)', text: '#ffffff' }
      : { fill: 'hsl(0, 0%, 93%)', text: '#111111' };
  }
  const isBuy = status === '신규매수' || status === '비중확대';
  const t = Math.min(1, Math.sqrt(Math.abs(deltaWeight) / MAX_DELTA));
  const hue = isBuy ? 3 : 217; // --color-up · --color-down 과 같은 색상
  if (isDark) {
    const L = 26 + 22 * t; // 26 → 48
    const S = 45 + 20 * t; // 45 → 65
    return { fill: `hsl(${hue}, ${S}%, ${L}%)`, text: '#ffffff' };
  }
  const L = 94 - 38 * t; // 94 → 56
  const S = 50 + 28 * t; // 50 → 78
  return {
    fill: `hsl(${hue}, ${S}%, ${L}%)`,
    text: L < 60 ? '#ffffff' : '#111111',
  };
}

function formatChange(change: number | null, status: StatusKr): string {
  if (status === '신규매수' || change === null) return 'NEW';
  if (Math.abs(change) < 0.05) return '변동 없음';
  return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
}

interface Props {
  holdings: PortfolioHolding[];
}

type HoverState = { cell: Cell; x: number; y: number } | null;

/** 트리맵 칸 크기 = 비중, 색 = 전분기 대비 비중 변동 */
export default function PortfolioTreemap({ holdings }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [containerW, setContainerW] = useState(680);
  const [hover, setHover] = useState<HoverState>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.clientWidth > 0) setContainerW(el.clientWidth); // 관찰 콜백을 기다리지 않고 첫 화면부터 실제 폭으로
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        if (w > 0) setContainerW(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = Math.max(280, containerW);
  const H = isMobile ? 460 : 520;

  const cells = useMemo(() => {
    const out: Cell[] = [];
    for (const h of holdings) {
      const statusKr = STATUS_MAP[h.status];
      if (!statusKr || h.weight_curr <= 0) continue;
      out.push({
        ticker: h.ticker || h.cusip.slice(0, 6),
        name: h.name_of_issuer,
        weight: h.weight_curr,
        marketValue: formatUsd(h.value_curr),
        status: statusKr,
        change: h.status === 'NEW BUY' ? null : h.shares_change_pct,
        deltaWeight: h.status === 'NEW BUY' ? h.weight_curr : Math.abs((h.weight_curr ?? 0) - (h.weight_prev ?? 0)),
      });
    }
    return out;
  }, [holdings]);

  const leaves = useMemo(() => {
    if (cells.length === 0) return [];
    type Datum = { children: Cell[] } | Cell;
    const isBranch = (d: Datum): d is { children: Cell[] } =>
      (d as { children?: unknown }).children !== undefined;
    const root = hierarchy<Datum>({ children: cells }, (d) =>
      isBranch(d) ? d.children : null
    ).sum((d) => (isBranch(d) ? 0 : d.weight));
    const laid = treemap<Datum>()
      .size([W, H])
      .paddingInner(2)
      .round(true)(root);
    return laid.leaves();
  }, [cells, W, H]);

  if (cells.length === 0) return null;

  const handleEnter = (cell: Cell, e: React.MouseEvent) => {
    if (isMobile) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ cell, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleTap = (cell: Cell) => {
    if (!isMobile) return;
    setHover({ cell, x: 0, y: 0 });
  };

  return (
    <section aria-label="보유 비중 지도" className="mt-5">
      {/* 범례 — 매도(파랑) · 유지(회색) · 매수(빨강) */}
      <div className="mb-2 flex items-center justify-end gap-2 text-xs text-[var(--theme-ink-soft)]">
        <span className="hidden sm:inline mr-1">칸 크기는 비중, 색은 전분기 대비 비중 변동</span>
        <span className="font-bold text-[var(--color-down)]">매도</span>
        <span
          className="inline-block h-2 w-28 sm:w-40"
          style={{
            background: isDark
              ? 'linear-gradient(to right, hsl(217,65%,48%), hsl(217,45%,26%), hsl(0,0%,22%), hsl(3,45%,26%), hsl(3,65%,48%))'
              : 'linear-gradient(to right, hsl(217,78%,56%), hsl(217,50%,94%), hsl(0,0%,93%), hsl(3,50%,94%), hsl(3,78%,56%))',
          }}
        />
        <span className="font-bold text-[var(--color-up)]">매수</span>
      </div>

      <div ref={containerRef} className="relative overflow-hidden">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="block"
          onMouseLeave={() => setHover(null)}
        >
          {leaves.map((leaf, i) => {
            const d = leaf.data as Cell;
            const w = leaf.x1 - leaf.x0;
            const h = leaf.y1 - leaf.y0;
            const colors = getCellColors(d.deltaWeight, d.status, isDark);
            const showFull = w > 70 && h > 40;
            const showTicker = w > 32 && h > 16;
            return (
              <g
                key={`${d.ticker}-${i}`}
                transform={`translate(${leaf.x0},${leaf.y0})`}
                onMouseMove={(e) => handleEnter(d, e)}
                onClick={() => handleTap(d)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  width={w}
                  height={h}
                  style={{ fill: colors.fill }}
                />
                {showFull && (
                  <>
                    <text
                      x={8}
                      y={22}
                      className="pointer-events-none"
                      style={{
                        fill: colors.text,
                        fontSize: 15,
                        fontWeight: 800,
                      }}
                    >
                      {d.ticker}
                    </text>
                    <text
                      x={8}
                      y={38}
                      className="pointer-events-none"
                      style={{
                        fill: colors.text,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {d.weight.toFixed(1)}%
                    </text>
                  </>
                )}
                {!showFull && showTicker && (
                  <text
                    x={5}
                    y={14}
                    className="pointer-events-none"
                    style={{
                      fill: colors.text,
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {d.ticker}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* 데스크탑 툴팁 */}
        {hover && !isMobile && (
          <div
            className="absolute pointer-events-none z-10 bg-[var(--background)] border border-[var(--theme-border)] p-3 text-xs"
            style={{
              left: Math.min(hover.x + 12, Math.max(0, containerW - 220)),
              top: Math.min(hover.y + 12, H - 140),
              minWidth: 200,
            }}
          >
            <div className="font-bold text-foreground text-sm">
              {hover.cell.ticker}
            </div>
            <div className="text-[11px] text-[var(--theme-ink-soft)] mb-2 truncate">
              {hover.cell.name}
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <span className="text-[var(--theme-ink-soft)]">평가액</span>
              <span className="font-mono text-foreground text-right font-bold">
                {hover.cell.marketValue}
              </span>
              <span className="text-[var(--theme-ink-soft)]">비중</span>
              <span className="font-mono text-foreground text-right font-bold">
                {hover.cell.weight.toFixed(2)}%
              </span>
              <span className="text-[var(--theme-ink-soft)]">상태</span>
              <span className="text-foreground text-right font-medium">
                {hover.cell.status}
              </span>
              <span className="text-[var(--theme-ink-soft)]">변동</span>
              <span className="font-mono text-foreground text-right font-bold">
                {formatChange(hover.cell.change, hover.cell.status)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 모바일 카드 */}
      {hover && isMobile && (
        <div className="mt-2 border-y border-[var(--theme-border-muted)] py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold text-foreground text-sm">
                {hover.cell.ticker}
              </div>
              <div className="text-[11px] text-[var(--theme-ink-soft)] truncate">
                {hover.cell.name}
              </div>
            </div>
            <button
              onClick={() => setHover(null)}
              className="text-base leading-none text-[var(--theme-ink-soft)] px-1"
              aria-label="닫기"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 mt-2 text-xs">
            <span className="text-[var(--theme-ink-soft)]">평가액</span>
            <span className="font-mono text-foreground text-right font-bold">
              {hover.cell.marketValue}
            </span>
            <span className="text-[var(--theme-ink-soft)]">비중</span>
            <span className="font-mono text-foreground text-right font-bold">
              {hover.cell.weight.toFixed(2)}%
            </span>
            <span className="text-[var(--theme-ink-soft)]">상태</span>
            <span className="text-foreground text-right font-medium">
              {hover.cell.status}
            </span>
            <span className="text-[var(--theme-ink-soft)]">변동</span>
            <span className="font-mono text-foreground text-right font-bold">
              {formatChange(hover.cell.change, hover.cell.status)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
