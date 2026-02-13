import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-8xl font-bold font-bold text-ant-red-500 ">404</h1>
        <h2 className="mt-4 text-2xl font-bold text-[var(--foreground)]">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
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
