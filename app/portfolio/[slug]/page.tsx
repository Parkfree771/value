'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { GURU_LIST } from '@/app/guru-tracker/types';
import { GURU_PORTFOLIOS } from '@/app/guru-tracker/portfolioData';
import PortfolioTable from '@/components/PortfolioTable';

export default function PortfolioPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // slug를 guru name으로 변환 (예: "warren-buffett" -> "Warren Buffett")
  const guruNameEn = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // 구루 정보 찾기
  const guruInfo = GURU_LIST.find(g => g.name_en === guruNameEn);
  const portfolio = guruInfo ? GURU_PORTFOLIOS[guruInfo.name_en] : null;

  // 구루를 찾지 못한 경우
  if (!guruInfo) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card-base p-12 text-center">
          <div className="text-4xl font-bold text-gray-300 dark:text-gray-600 mb-4 font-pixel">404</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            구루를 찾을 수 없습니다
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            요청하신 투자 거장의 정보를 찾을 수 없습니다.
          </p>
          <Link
            href="/guru-tracker"
            className="btn-primary inline-block"
          >
            구루 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* 뒤로가기 버튼 */}
      <div className="mb-4 sm:mb-6">
        <button
          onClick={() => router.back()}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-bold">돌아가기</span>
        </button>
      </div>

      {/* 구루 헤더 섹션 */}
      <section className="mb-6 sm:mb-8 bg-pixel-card border-3 border-pixel-border p-6 sm:p-8 relative overflow-hidden" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* 프로필 이미지 */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 border-3 border-ant-red-600 dark:border-ant-red-400 overflow-hidden flex-shrink-0" style={{ boxShadow: 'var(--shadow-lg)' }}>
              <Image
                src={`/${guruInfo.image_filename}`}
                alt={guruInfo.name_kr}
                fill
                className="object-cover"
              />
            </div>

            {/* 구루 정보 */}
            <div className="flex-1 text-center sm:text-left">
              <div className="inline-block mb-3 px-4 py-1.5 border-2 border-ant-red-600 dark:border-ant-red-400 bg-ant-red-50 dark:bg-ant-red-950/30">
                <span className="text-xs font-bold tracking-widest text-ant-red-600 dark:text-ant-red-400 uppercase font-pixel">
                  {guruInfo.style}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground mb-2 tracking-tight font-pixel text-shadow-pixel">
                {guruInfo.name_kr}
              </h1>

              <p className="text-lg sm:text-xl text-ant-red-600 dark:text-ant-red-400 mb-3 font-bold font-pixel">
                {guruInfo.name_en}
              </p>

              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 max-w-2xl">
                {guruInfo.catchphrase}
              </p>

              <div className="inline-block px-4 py-2 border-2 border-pixel-border-muted bg-pixel-bg" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">운용사</p>
                <p className="text-sm font-bold text-foreground">{guruInfo.filing_name}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 포트폴리오 섹션 */}
      <section>
        {portfolio ? (
          <>
            {/* 포트폴리오 요약 정보 */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card-base p-4 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">총 포트폴리오 가치</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground font-pixel">
                  ${(portfolio.totalValue / 1000000000).toFixed(1)}B
                </p>
              </div>

              <div className="card-base p-4 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">보유 종목 수</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground font-pixel">
                  {portfolio.holdings.length}
                </p>
              </div>

              <div className="card-base p-4 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">13F 공시일</p>
                <p className="text-lg sm:text-xl font-bold text-foreground font-pixel">
                  {new Date(portfolio.filingDate).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>

            {/* 포트폴리오 테이블 */}
            <PortfolioTable portfolio={portfolio} />
          </>
        ) : (
          <div className="card-base p-12 text-center">
            <div className="text-4xl font-bold text-gray-300 dark:text-gray-600 mb-4 font-pixel">13F</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              포트폴리오 데이터 준비중
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {guruInfo.name_kr}의 13F 공시 데이터를 곧 추가할 예정입니다.
            </p>
          </div>
        )}
      </section>

      {/* 면책 조항 */}
      <section className="mt-12 p-6 sm:p-8 bg-pixel-card border-3 border-pixel-border-muted border-l-ant-red-600 dark:border-l-ant-red-400" style={{ borderLeftWidth: '6px', boxShadow: 'var(--shadow-md)' }}>
        <h3 className="text-base sm:text-lg font-bold text-foreground mb-4 tracking-wide uppercase font-pixel">
          13F 공시의 '135일 시차' 주의사항
        </h3>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p className="leading-relaxed">
            13F 보고서는 분기 종료 후 45일 뒤에 공개됩니다. 따라서 구루가 실제로 매수한 시점과 공개 시점 사이에
            <strong className="text-ant-red-600 dark:text-ant-red-400"> 최대 135일의 시차</strong>가 발생할 수 있습니다.
          </p>
          <p className="leading-relaxed">
            본 사이트의 수익률 추적은 <strong>"공시된 가격(분기 말)을 기준으로 따라 샀을 때"</strong>를 가정한
            시뮬레이션입니다. 구루들의 실제 진입 시점 및 수익률과는 차이가 있으며,
            재미와 인사이트 발견을 위한 데이터로만 참고해 주시기 바랍니다.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t-2 border-pixel-border-muted text-xs text-gray-600 dark:text-gray-400 space-y-2">
          <div className="flex gap-2"><strong className="font-bold text-ant-red-600 dark:text-ant-red-400 font-pixel">TIME LAG:</strong> <span>13F 공시는 매수 시점으로부터 최대 135일 지연된 데이터일 수 있습니다.</span></div>
          <div className="flex gap-2"><strong className="font-bold text-ant-red-600 dark:text-ant-red-400 font-pixel">TRACKING METHOD:</strong> <span>표기된 수익률은 공시된 보고서 가격 대비 현재가를 산출한 것으로, 해당 투자자의 실제 평단가와는 무관합니다.</span></div>
          <div className="flex gap-2"><strong className="font-bold text-ant-red-600 dark:text-ant-red-400 font-pixel">FOR ENTERTAINMENT:</strong> <span>이 데이터는 투자 권유가 아니며, 유명 투자자들의 포트폴리오를 기반으로 한 후행적 분석 시뮬레이션입니다. 실제 투자의 책임은 본인에게 있습니다.</span></div>
        </div>
      </section>
    </div>
  );
}
