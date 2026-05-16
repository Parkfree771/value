// 루트 loading boundary — 모든 페이지 전환에서 첫 콘텐츠가 준비되기 전 표시.
// SSR에서 server component가 데이터 fetch 중일 때 클라이언트는 이걸 본다.
// 빈 화면 대신 즉시 스피너 + 컨테이너로 perceived load 단축.
export default function RootLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="card-base p-6 sm:p-12 text-center">
        <div className="inline-block w-8 h-8 border-2 border-ant-red-600 border-t-transparent animate-spin mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">로딩 중...</p>
      </div>
    </div>
  );
}
