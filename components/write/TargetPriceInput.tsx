'use client';

// 글쓰기 — 투자 의견 선택 + 목표가 입력
// 목표가는 종목을 고르면 현재가로 채워지고, +10% · +100% 같은 버튼으로 바로 정할 수 있다 (직접 입력도 가능).

export type Opinion = 'buy' | 'sell' | 'hold';

const OPINIONS: { value: Opinion; label: string; desc: string }[] = [
  { value: 'buy', label: '매수', desc: '오를 것 같다' },
  { value: 'sell', label: '매도', desc: '내릴 것 같다' },
  { value: 'hold', label: '보유', desc: '지켜본다' },
];

export function OpinionPicker({ value, onChange, compact = false }: { value: Opinion; onChange: (v: Opinion) => void; compact?: boolean }) {
  return (
    <div role="radiogroup" aria-label="투자 의견" className="grid grid-cols-3 border border-[var(--theme-border)] rounded-[2px] overflow-hidden">
      {OPINIONS.map((o, i) => {
        const active = value === o.value;
        const color = o.value === 'buy' ? 'var(--color-up)' : o.value === 'sell' ? 'var(--color-down)' : 'var(--foreground)';
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`${compact ? 'py-1.5' : 'py-2.5'} text-center transition-colors ${i > 0 ? 'border-l border-[var(--theme-border)]' : ''} ${
              active ? 'text-white' : 'hover:bg-[var(--theme-bg)]'
            }`}
            style={active ? { backgroundColor: color } : undefined}
          >
            <span className={`block font-bold ${compact ? 'text-xs' : 'text-[15px]'}`}>{o.label}</span>
            {!compact && <span className={`block text-[11px] ${active ? 'text-white/80' : 'text-[var(--theme-ink-soft)]'}`}>{o.desc}</span>}
          </button>
        );
      })}
    </div>
  );
}

// 소수점 없이 쓰는 통화
const INTEGER_CURRENCIES = new Set(['KRW', 'JPY']);

export function priceDecimals(currency?: string) {
  return INTEGER_CURRENCIES.has((currency || '').toUpperCase()) ? 0 : 2;
}

/** 숫자 → 입력창 표시 문자열 (천 단위 쉼표, 통화별 소수 자리) */
export function formatPriceInput(n: number, currency?: string): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  const d = priceDecimals(currency);
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d });
}

export function parsePriceInput(s: string): number {
  return parseFloat(s.replace(/,/g, '')) || 0;
}

/** 타이핑 중 정리 — 숫자·소수점 하나만, 정수부에 쉼표 */
function cleanTyping(raw: string, currency?: string): string {
  const d = priceDecimals(currency);
  let v = raw.replace(/[^0-9.]/g, '');
  if (d === 0) v = v.replace(/\./g, '');
  const [int, ...rest] = v.split('.');
  const frac = rest.join('').slice(0, d);
  const intFmt = int ? Number(int).toLocaleString('en-US') : rest.length ? '0' : '';
  return v.includes('.') && d > 0 ? `${intFmt}.${frac}` : intFmt;
}

const STEPS_UP = [10, 30, 50, 100, 300];
const STEPS_DOWN = [-10, -20, -30, -50];

interface TargetPriceInputProps {
  value: string;
  onChange: (v: string) => void;
  currentPrice?: number | null;
  currency?: string;
  opinion: Opinion;
  compact?: boolean;
}

export default function TargetPriceInput({ value, onChange, currentPrice, currency, opinion, compact = false }: TargetPriceInputProps) {
  const target = parsePriceInput(value);
  const cur = currentPrice && currentPrice > 0 ? currentPrice : null;
  const pct = cur && target > 0 ? ((target - cur) / cur) * 100 : null;
  const steps = opinion === 'sell' ? STEPS_DOWN : STEPS_UP;
  // 매수인데 목표가가 현재가보다 낮거나, 매도인데 높으면 알려준다
  const mismatch = pct !== null && ((opinion === 'buy' && pct < 0) || (opinion === 'sell' && pct > 0));

  const apply = (p: number) => {
    if (!cur) return;
    onChange(formatPriceInput(cur * (1 + p / 100), currency));
  };
  const activeStep = pct !== null ? steps.find((p) => Math.abs(p - pct) < 0.05) : undefined;

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          inputMode={priceDecimals(currency) > 0 ? 'decimal' : 'numeric'}
          value={value}
          onChange={(e) => onChange(cleanTyping(e.target.value, currency))}
          required
          aria-label="목표 가격"
          placeholder={cur ? formatPriceInput(cur, currency) : '종목을 먼저 고르세요'}
          className={`pixel-input tabular-nums ${compact ? '!py-1 !text-xs' : '!py-3 !text-lg font-bold'} pr-14`}
        />
        {currency && (
          <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-ink-soft)] ${compact ? 'text-[10px]' : 'text-xs font-bold'}`}>
            {currency}
          </span>
        )}
      </div>

      {/* 현재가 기준 빠른 선택 */}
      <div className={`flex flex-wrap gap-1.5 ${compact ? 'mt-1' : 'mt-2'}`}>
        {steps.map((p) => (
          <button
            key={p}
            type="button"
            disabled={!cur}
            onClick={() => apply(p)}
            className={`border rounded-[2px] tabular-nums font-bold transition-colors disabled:opacity-40 ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'} ${
              activeStep === p
                ? 'bg-[var(--theme-border)] border-[var(--theme-border)] text-[var(--background)]'
                : 'border-[var(--theme-border-muted)] hover:border-[var(--theme-border)]'
            }`}
          >
            {p > 0 ? '+' : ''}
            {p}%
          </button>
        ))}
        <button
          type="button"
          disabled={!cur}
          onClick={() => apply(0)}
          className={`border rounded-[2px] border-[var(--theme-border-muted)] hover:border-[var(--theme-border)] text-[var(--theme-ink-soft)] transition-colors disabled:opacity-40 ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
        >
          현재가
        </button>
      </div>

      {!compact && (
        <p className="mt-2 text-xs text-[var(--theme-ink-soft)] tabular-nums">
          {cur ? (
            <>
              현재가 {formatPriceInput(cur, currency)} {currency} 대비{' '}
              {pct !== null ? (
                <span className={`font-bold ${pct > 0 ? 'text-[var(--color-up)]' : pct < 0 ? 'text-[var(--color-down)]' : ''}`}>
                  {pct > 0 ? '+' : ''}
                  {pct.toFixed(1)}%
                </span>
              ) : (
                '—'
              )}
              {mismatch && (
                <span className="ml-2 font-bold text-[var(--theme-orange)]">
                  {opinion === 'buy' ? '매수인데 목표가가 현재가보다 낮아요' : '매도인데 목표가가 현재가보다 높아요'}
                </span>
              )}
            </>
          ) : (
            '종목을 고르면 현재가가 채워지고, 버튼으로 목표가를 바로 정할 수 있어요.'
          )}
        </p>
      )}
    </div>
  );
}
