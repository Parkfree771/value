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
        <div className="w-16 h-16 mx-auto mb-6 bg-red-900/30 border-3 border-red-500 flex items-center justify-center shadow-pixel">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">
          오류가 발생했습니다
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
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
          <div className="mt-8 p-4 bg-black/30 border-2 border-[var(--pixel-border-muted)] text-left max-w-lg mx-auto shadow-pixel">
            <p className="text-xs text-gray-400 mb-1 font-bold">Error details (dev only):</p>
            <p className="text-sm text-red-400 font-mono break-all">
              {error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
