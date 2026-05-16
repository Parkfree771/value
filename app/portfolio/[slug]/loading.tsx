// /portfolio/[slug] — guru-portfolios.json read + Supabase guru_prices fetch.
// SSR 첫 LCP 보호.
export default function PortfolioLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="card-base p-6 sm:p-12 text-center">
        <div className="inline-block w-8 h-8 border-2 border-ant-red-600 border-t-transparent animate-spin mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">포트폴리오를 불러오는 중...</p>
      </div>
    </div>
  );
}
