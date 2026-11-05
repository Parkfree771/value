'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="kicker mb-3">Error</p>
        <div className="w-14 h-14 mx-auto mb-5 border border-[var(--theme-border)] flex items-center justify-center">
          <svg className="w-7 h-7 text-[var(--color-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="headline text-2xl sm:text-[28px]">
          오류가 발생했습니다
        </h2>
        <p className="mt-2 text-sm text-[var(--theme-ink-soft)]">
          일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={() => reset()} className="btn-primary px-6 py-3">
            다시 시도
          </button>
          <a href="/" className="btn-secondary px-6 py-3">
            홈으로 돌아가기
          </a>
        </div>
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mt-8 p-4 bg-[var(--theme-bg)] border-l-2 border-[var(--color-error)] text-left max-w-lg mx-auto">
            <p className="text-xs text-[var(--theme-ink-soft)] mb-1 font-bold">Error details (dev only):</p>
            <p className="text-sm text-[var(--color-error)] font-mono break-all">
              {error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
