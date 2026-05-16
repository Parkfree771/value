// /ranking — 서버에서 posts 정렬·필터링 SQL 후 렌더. 모바일 페이지 전환 시 빈 화면 방지.
export default function RankingLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="card-base p-6 sm:p-12 text-center">
        <div className="inline-block w-8 h-8 border-2 border-ant-red-600 border-t-transparent animate-spin mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">랭킹을 불러오는 중...</p>
      </div>
    </div>
  );
}
