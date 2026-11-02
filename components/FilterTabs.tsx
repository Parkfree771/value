// 글자 탭 필터 — 랭킹 · 종목 검색 공용. 넘치면 옆으로 민다.

interface FilterTabsProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: (value: T) => string;
  className?: string;
}

export default function FilterTabs<T extends string>({ options, value, onChange, label, className = '' }: FilterTabsProps<T>) {
  return (
    <div className={`flex min-w-0 overflow-x-auto scrollbar-hide ${className}`}>
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={`flex-shrink-0 px-2 py-1.5 text-[13px] whitespace-nowrap border-b-2 transition-colors ${
              active
                ? 'font-bold text-[var(--foreground)] border-[var(--theme-border)]'
                : 'border-transparent text-[var(--theme-ink-soft)] hover:text-[var(--foreground)]'
            }`}
          >
            {label(option)}
          </button>
        );
      })}
    </div>
  );
}
