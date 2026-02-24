'use client';

import Link from 'next/link';
import { GURU_LIST } from './types';

export default function GuruTrackerPage() {

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* 페이지 소개 섹션 */}
      <section className="mb-6 sm:mb-8 bg-ant-red-950 dark:bg-ant-red-950 border-3 border-pixel-border p-6 sm:p-8 relative overflow-hidden" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="relative z-10">
          <div className="text-center mb-6 sm:mb-7">
            <div className="inline-block mb-2 sm:mb-3 px-4 py-1.5 border-2 border-ant-red-600 dark:border-ant-red-400 bg-ant-red-50 dark:bg-ant-red-950/30">
              <span className="text-xs font-bold tracking-widest text-ant-red-600 dark:text-ant-red-400 uppercase">Investment Masters Observatory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-1.5 sm:mb-2 tracking-tight leading-tight text-shadow-pixel">
              GURU TRACKER
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-ant-red-300 tracking-wide font-bold">
              투자의 거인을 추적하다
            </p>
          </div>

          <div className="max-w-3xl mx-auto text-center px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-ant-red-400 mb-4 sm:mb-5 tracking-widest text-glow-red">
              GURU
            </h2>

            <blockquote className="relative">
              <p className="text-sm sm:text-base md:text-lg text-gray-200 leading-relaxed mb-4 sm:mb-5">
                구루(Guru)는 산스크리트어로 '지혜의 무게가 남다른 스승'을 의미합니다.
                <br className="hidden sm:block" />
                가벼운 정보가 넘쳐나는 세상에서 묵직한 통찰로 삶의 이정표가 되어주는 존재,
                <br className="hidden sm:block" />
                즉 어둠을 걷어내고 빛을 건네는 자를 뜻합니다.
                <br className="hidden sm:block" />
                금융 시장에서도 마찬가지입니다.
                <br className="hidden sm:block" />
                시장의 소음에 흔들리지 않는 철학, 그리고 압도적인 성과로 투자의 본질을 증명해 낸
                <br className="hidden sm:block" />
                워렌 버핏, 피터 린치 같은 전설적인 거장들.
                <br className="hidden sm:block" />
                우리는 그들을 <strong className="text-ant-red-400 font-bold">투자의 구루</strong>라 부릅니다.
              </p>
            </blockquote>

            <div className="mt-5 sm:mt-7 pt-4 sm:pt-5 border-t-2 border-ant-red-800">
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                구루들의 13F 공시가 발표된 당일, 그들과 똑같이 매수했다면 내 계좌는 어떻게 변했을까요?<br className="hidden sm:block" />
                이곳에서는 <strong className="text-ant-red-400 font-bold">'만약 그때 그들을 따라 했다면?'</strong>이라는 가정을 실제 데이터로 추적하여, 그 결과값을 있는 그대로 보여드립니다.
              </p>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mt-3">
                비록 실제 매매와 공시 사이에는 최대 135일의 시차가 존재하지만, 그럼에도 불구하고 시장을 꿰뚫는 그들의 지혜와 통찰은 여전히 우리에게 훌륭한 길잡이가 되어줄 것입니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 구루 목록 */}
      <section className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-4 sm:mb-6 tracking-wider uppercase">
          GURU 목록
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {GURU_LIST.map((guru) => (
            <Link
              key={guru.name_en}
              href={`/portfolio/${guru.name_en.toLowerCase().replace(/\s+/g, '-')}`}
              className="card-interactive text-left p-5 sm:p-6 block"
            >
              <div className="mb-3">
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">
                  {guru.name_kr}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {guru.name_en}
                </p>
              </div>

              <div className="mb-3 pb-3 border-b-2 border-pixel-border-muted">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">운용사</p>
                <p className="text-sm font-semibold text-foreground">
                  {guru.filing_name}
                </p>
              </div>

              <div className="mb-3">
                <span className="badge-base bg-ant-red-50 dark:bg-ant-red-950/30 text-ant-red-600 dark:text-ant-red-400 border-ant-red-300 dark:border-ant-red-700">
                  {guru.style}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {guru.catchphrase}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* 면책 조항 */}
      <section className="mt-12 p-6 sm:p-8 bg-pixel-card border-3 border-pixel-border-muted border-l-ant-red-600 dark:border-l-ant-red-400" style={{ borderLeftWidth: '6px', boxShadow: 'var(--shadow-md)' }}>
        <h3 className="text-base sm:text-lg font-bold text-foreground mb-4 tracking-wide uppercase">
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
          <div className="flex gap-2"><strong className="font-bold text-ant-red-600 dark:text-ant-red-400">TIME LAG:</strong> <span>13F 공시는 매수 시점으로부터 최대 135일 지연된 데이터일 수 있습니다.</span></div>
          <div className="flex gap-2"><strong className="font-bold text-ant-red-600 dark:text-ant-red-400">TRACKING METHOD:</strong> <span>표기된 수익률은 공시된 보고서 가격 대비 현재가를 산출한 것으로, 해당 투자자의 실제 평단가와는 무관합니다.</span></div>
          <div className="flex gap-2"><strong className="font-bold text-ant-red-600 dark:text-ant-red-400">FOR ENTERTAINMENT:</strong> <span>이 데이터는 투자 권유가 아니며, 유명 투자자들의 포트폴리오를 기반으로 한 후행적 분석 시뮬레이션입니다. 실제 투자의 책임은 본인에게 있습니다.</span></div>
        </div>
      </section>
    </div>
  );
}
