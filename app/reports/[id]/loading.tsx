// /reports/[id] — 글 본문 + 가격/배지 join. SSR 동안 빈 화면 방지.
export default function ReportLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="card-base p-6 sm:p-12 text-center animate-pulse">
        <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-4 mx-auto" />
        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-6 mx-auto" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      </div>
    </div>
  );
}
