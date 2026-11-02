// 페이지 이동 — 상자 없는 글자 줄. 현재 쪽만 밑줄 + 굵게.

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

const STEP = 'flex-shrink-0 px-2 py-1.5 text-[13px] font-bold text-[var(--foreground)] hover:underline underline-offset-4 disabled:text-[var(--theme-ink-soft)] disabled:no-underline disabled:cursor-not-allowed';

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="페이지 이동" className="mt-6 sm:mt-8 flex justify-center items-center gap-2">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} className={STEP}>
        이전
      </button>
      <div className="flex gap-0.5 min-w-0 overflow-x-auto scrollbar-hide">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`flex-shrink-0 min-w-8 px-1.5 py-1.5 text-[13px] tabular-nums border-b-2 transition-colors ${
              p === page
                ? 'font-bold text-[var(--foreground)] border-[var(--theme-border)]'
                : 'border-transparent text-[var(--theme-ink-soft)] hover:text-[var(--foreground)]'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page === totalPages} className={STEP}>
        다음
      </button>
    </nav>
  );
}
