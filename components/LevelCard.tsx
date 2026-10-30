import { getLevelInfo, LEVEL_RULES, MAX_LEVEL } from '@/lib/levels';

// 마이페이지·유저 페이지 레벨 카드 — 레벨 숫자 · 다음 레벨까지 진행 · 점수 내역

export interface LevelBreakdown {
  record: number;
  hold: number;
  profit: number;
}

interface Props {
  points: number;
  breakdown?: LevelBreakdown | null;
  /** 본인 화면이면 "내 레벨" */
  isMine?: boolean;
}

export default function LevelCard({ points, breakdown, isMine = false }: Props) {
  const info = getLevelInfo(points);
  const remain = info.nextAt !== null ? info.nextAt - info.points : 0;

  return (
    <section className="card-base overflow-hidden">
      <div className="p-4 sm:p-6">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{isMine ? '내 레벨' : '레벨'}</p>
        <p className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--theme-accent)]">Lv.{info.level}</p>

        <div className="mt-2 max-w-md">
          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700/60 overflow-hidden">
            <div className="h-full rounded-full bg-[var(--theme-accent)] transition-all" style={{ width: `${Math.round(info.progress * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            <span className="font-mono font-bold">{info.points.toLocaleString('ko-KR')}점</span>
            {info.nextAt !== null ? (
              <> · Lv.{info.level + 1}까지 <span className="font-mono font-bold">{remain.toLocaleString('ko-KR')}점</span></>
            ) : (
              <> · 최고 레벨 (Lv.{MAX_LEVEL})</>
            )}
          </p>
        </div>
      </div>

      {/* 점수 내역 / 얻는 법 */}
      <div className="border-t-2 border-[var(--theme-border-muted)] px-4 py-3 sm:px-6 grid gap-2 sm:grid-cols-3">
        {LEVEL_RULES.map((rule) => (
          <div key={rule.key} className="flex items-baseline justify-between gap-2 sm:block">
            <div className="text-xs">
              <span className="font-bold text-gray-800 dark:text-gray-100">{rule.label}</span>
              <span className="ml-1.5 text-gray-500 dark:text-gray-400">{rule.desc}</span>
            </div>
            {breakdown && (
              <div className="font-mono font-black text-sm text-gray-900 dark:text-white sm:mt-0.5">
                +{breakdown[rule.key].toLocaleString('ko-KR')}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="px-4 pb-3 sm:px-6 text-[11px] text-gray-500 dark:text-gray-400">
        레벨은 한 번 오르면 내려가지 않아요. 수익률이 떨어져도 지금까지 도달한 최고 점수가 유지됩니다.
      </p>
    </section>
  );
}
