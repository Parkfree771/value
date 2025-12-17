'use client';

import Link from 'next/link';

interface Investor {
  rank: number;
  name: string;
  avgReturnRate: number;
  linkPath?: string; // 선택적 링크 경로
}

interface PodiumProps {
  topThree: Investor[];
}

export default function Podium({ topThree }: PodiumProps) {
  const [first, second, third] = topThree;

  const getPodiumHeight = (rank: number) => {
    if (rank === 1) return 'h-32';
    if (rank === 2) return 'h-24';
    if (rank === 3) return 'h-20';
    return 'h-20';
  };

  const getPodiumStyle = (rank: number) => {
    if (rank === 1) {
      // 다이아몬드 - 투명하고 반짝이는 크리스탈 (왼쪽에서 오른쪽으로)
      return 'bg-gradient-to-r from-cyan-300 via-blue-200 to-purple-300';
    }
    if (rank === 2) {
      // 골드
      return 'bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 border-2 border-yellow-400';
    }
    if (rank === 3) {
      // 실버
      return 'bg-gradient-to-br from-slate-200 via-gray-300 to-slate-400 border-2 border-slate-300';
    }
    return 'bg-gray-200';
  };

  return (
    <div className="relative mb-8 px-4">
      {/* 배경 장식 */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20 rounded-2xl -z-10"></div>

      <div className="max-w-3xl mx-auto pt-8 pb-6">
        <div className="text-center mb-8">
          <div className="inline-block">
            <h2 className="text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
              TOP 3 투자자
            </h2>
            <div className="h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-xs">이번 달 최고 수익률 달성</p>
        </div>

        <div className="flex items-end justify-center gap-4 max-w-2xl mx-auto px-4">
          {/* 2위 */}
          {second && (
            <div className="flex-1 flex flex-col items-center">
              <Link
                href={second.linkPath || `/user/${encodeURIComponent(second.name)}`}
                className="w-full flex flex-col items-center group cursor-pointer"
              >
                {/* 프로필 영역 */}
                <div className="mb-3 text-center transform group-hover:-translate-y-1 transition-all duration-300">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    {/* 골드 플레이 버튼 느낌 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 rounded-lg rotate-45 shadow-xl border-2 border-yellow-400"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-black text-white drop-shadow-lg z-10">2</span>
                    </div>
                  </div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-amber-500 transition-colors mb-2 px-2">
                    {second.name}
                  </div>
                  <div className={`inline-block px-3 py-1 ${
                    second.avgReturnRate >= 0
                      ? 'bg-gradient-to-r from-red-500 to-rose-600'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600'
                  } text-white font-bold rounded-full text-xs shadow-md`}>
                    {second.avgReturnRate >= 0 ? '+' : ''}{second.avgReturnRate.toFixed(2)}%
                  </div>
                </div>

                {/* 시상대 */}
                <div className="w-full relative">
                  <div className={`w-full ${getPodiumHeight(2)} ${getPodiumStyle(2)} rounded-t-xl shadow-xl group-hover:shadow-amber-400/60 transition-all duration-300 relative overflow-hidden`}>
                    {/* 광택 효과 */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent rounded-t-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent rounded-t-xl"></div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* 1위 */}
          {first && (
            <div className="flex-1 flex flex-col items-center">
              <Link
                href={first.linkPath || `/user/${encodeURIComponent(first.name)}`}
                className="w-full flex flex-col items-center group cursor-pointer"
              >
                {/* 프로필 영역 */}
                <div className="mb-4 text-center transform group-hover:-translate-y-2 transition-all duration-300">
                  <div className="relative mb-5">
                    <div className="relative w-24 h-24 mx-auto">
                      {/* 다이아몬드 외곽 그림자 */}
                      <div className="absolute inset-0 rotate-45 blur-xl bg-cyan-400/50"></div>

                      {/* 다이아몬드 메인 바디 */}
                      <div className="absolute inset-0 rotate-45 bg-gradient-to-br from-cyan-200 via-blue-100 to-purple-200 rounded-lg shadow-2xl"></div>

                      {/* 상단 패싯 (테이블) - 밝은 면 */}
                      <div className="absolute inset-3 rotate-45 bg-gradient-to-br from-white/90 via-cyan-100/70 to-blue-200/60 rounded-md"></div>

                      {/* 왼쪽 패싯 - 어두운 면 */}
                      <div className="absolute top-3 left-0 w-1/2 h-3/4 rotate-45 bg-gradient-to-br from-cyan-400/40 to-transparent rounded-l-md"></div>

                      {/* 오른쪽 패싯 - 밝은 반사 */}
                      <div className="absolute top-3 right-0 w-1/2 h-3/4 rotate-45 bg-gradient-to-bl from-white/60 to-transparent rounded-r-md"></div>

                      {/* 하단 패싯 */}
                      <div className="absolute bottom-0 left-3 right-3 h-1/2 rotate-45 bg-gradient-to-t from-blue-300/50 to-transparent rounded-b-md"></div>

                      {/* 중앙 빛 반사 */}
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-8 rotate-45 bg-white/80 rounded-full blur-sm"></div>

                      {/* 다이아몬드 하이라이트 라인들 */}
                      <div className="absolute top-0 left-1/2 w-0.5 h-full rotate-45 bg-gradient-to-b from-white/60 via-transparent to-transparent"></div>
                      <div className="absolute top-1/2 left-0 w-full h-0.5 rotate-45 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>

                      {/* 반짝임 애니메이션 */}
                      <div className="absolute inset-0 rotate-45 bg-gradient-to-tr from-transparent via-white/30 to-transparent animate-pulse rounded-lg"></div>

                      {/* 순위 숫자 */}
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <span className="text-2xl font-black bg-gradient-to-r from-cyan-700 to-blue-700 bg-clip-text text-transparent drop-shadow-lg">1</span>
                      </div>
                    </div>
                  </div>
                  <div className="font-black text-base text-gray-900 dark:text-white group-hover:text-cyan-500 transition-colors mb-2 px-2">
                    {first.name}
                  </div>
                  <div className={`inline-block px-4 py-1 ${
                    first.avgReturnRate >= 0
                      ? 'bg-gradient-to-r from-red-500 via-rose-600 to-pink-600'
                      : 'bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-600'
                  } text-white font-black rounded-full shadow-lg text-sm`}>
                    {first.avgReturnRate >= 0 ? '+' : ''}{first.avgReturnRate.toFixed(2)}%
                  </div>
                </div>

                {/* 시상대 - 다이아몬드 크리스탈 */}
                <div className="w-full relative flex justify-center">
                  <div className="relative" style={{width: '85%'}}>
                    {/* 외곽 글로우 - 밝게 */}
                    <div className="absolute inset-0 bg-cyan-400/40 blur-xl animate-pulse"></div>

                    {/* 다이아몬드 시상대 */}
                    <div className={`relative ${getPodiumHeight(1)} shadow-2xl group-hover:shadow-cyan-300/80 transition-all duration-300`}>
                      {/* 메인 크리스탈 바디 - 밝고 투명한 */}
                      <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-br from-cyan-200 via-blue-100 to-purple-200 rounded-t-lg shadow-2xl">
                      </div>

                      {/* 왼쪽 패싯 - 약간 어두운 면 */}
                      <div className="absolute bottom-0 left-0 h-full w-1/2 bg-gradient-to-br from-cyan-400/40 to-transparent rounded-tl-lg">
                      </div>

                      {/* 오른쪽 패싯 - 밝은 반사 */}
                      <div className="absolute bottom-0 right-0 h-full w-1/2 bg-gradient-to-bl from-white/60 to-transparent rounded-tr-lg">
                      </div>

                      {/* 상단 밝은 면 */}
                      <div className="absolute top-0 left-1/4 right-1/4 h-1/2 bg-gradient-to-b from-white/90 via-cyan-100/60 to-transparent rounded-t-lg">
                      </div>

                      {/* 중앙 빛 반사 */}
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-white/80 rounded-full blur-sm"></div>

                      {/* 다이아몬드 하이라이트 라인들 */}
                      <div className="absolute top-0 left-1/2 w-0.5 h-full bg-gradient-to-b from-white/60 via-transparent to-transparent"></div>
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>

                      {/* 패싯 구분선 */}
                      <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-white/50 via-cyan-200/40 to-transparent"></div>
                      <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-white/50 via-cyan-200/40 to-transparent"></div>

                      {/* 반짝임 애니메이션 */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent animate-pulse rounded-t-lg"></div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* 3위 */}
          {third && (
            <div className="flex-1 flex flex-col items-center">
              <Link
                href={third.linkPath || `/user/${encodeURIComponent(third.name)}`}
                className="w-full flex flex-col items-center group cursor-pointer"
              >
                {/* 프로필 영역 */}
                <div className="mb-3 text-center transform group-hover:-translate-y-1 transition-all duration-300">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    {/* 실버 플레이 버튼 느낌 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-gray-300 to-slate-400 rounded-lg rotate-45 shadow-xl border-2 border-slate-300"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-black text-gray-700 drop-shadow-lg z-10">3</span>
                    </div>
                  </div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-slate-500 transition-colors mb-2 px-2">
                    {third.name}
                  </div>
                  <div className={`inline-block px-3 py-1 ${
                    third.avgReturnRate >= 0
                      ? 'bg-gradient-to-r from-red-500 to-rose-600'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600'
                  } text-white font-bold rounded-full text-xs shadow-md`}>
                    {third.avgReturnRate >= 0 ? '+' : ''}{third.avgReturnRate.toFixed(2)}%
                  </div>
                </div>

                {/* 시상대 */}
                <div className="w-full relative">
                  <div className={`w-full ${getPodiumHeight(3)} ${getPodiumStyle(3)} rounded-t-xl shadow-xl group-hover:shadow-slate-400/60 transition-all duration-300 relative overflow-hidden`}>
                    {/* 광택 효과 */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent rounded-t-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent rounded-t-xl"></div>
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* 바닥 라인 */}
        <div className="w-full h-2 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 shadow-inner rounded-sm"></div>
      </div>
    </div>
  );
}
