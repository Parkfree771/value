import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="kicker">Page not found</p>
        <h1 className="headline mt-2 text-8xl font-black tabular-nums">404</h1>
        <h2 className="headline mt-4 pt-4 border-t-2 border-[var(--theme-border)] text-2xl">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="mt-2 text-[var(--theme-ink-soft)]">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="btn-primary px-6 py-3">
            홈으로 돌아가기
          </Link>
          <Link href="/search" className="btn-secondary px-6 py-3">
            리포트 검색하기
          </Link>
        </div>
      </div>
    </div>
  );
}
