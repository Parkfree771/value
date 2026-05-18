'use client';

import { useState, memo } from 'react';

// ────────────────────────────────────────────────
// 배지 PNG 슬롯
// public/badges/<filename> 위치에 PNG가 있으면 보여주고, 없으면 placeholder
// ────────────────────────────────────────────────

interface BadgeSlotProps {
  filename: string;
  title: string;
  desc?: string;
}

const BadgeSlot = memo(function BadgeSlot({ filename, title, desc }: BadgeSlotProps) {
  const [error, setError] = useState(false);

  return (
    <div className="flex flex-col items-center gap-2 w-[128px]">
      <div className="relative w-24 h-24 bg-[var(--theme-bg-card)] border-2 border-dashed border-slate-400 dark:border-slate-500 rounded-lg overflow-hidden flex items-center justify-center">
        {!error ? (
          <img
            src={`/badges/${filename}`}
            alt={title}
            className="w-full h-full object-contain"
            onError={() => setError(true)}
          />
        ) : (
          <span className="text-[9px] text-gray-400 text-center px-1">파일 없음</span>
        )}
      </div>
      <div className="text-center w-full">
        <div className="text-xs font-bold text-foreground">{title}</div>
        {desc && <div className="text-[10px] text-muted leading-tight mt-0.5">{desc}</div>}
        <div className="text-[9px] font-mono text-gray-400 mt-1 break-all">{filename}</div>
      </div>
    </div>
  );
});

// ────────────────────────────────────────────────
// 만들어야 할 목록
// ────────────────────────────────────────────────

const SINGLE_PROFIT = [
  { lv: 1, pct: '10%', tier: 'Stone' },
  { lv: 2, pct: '30%', tier: 'Bronze' },
  { lv: 3, pct: '50%', tier: 'Silver' },
  { lv: 4, pct: '100%', tier: 'Gold' },
  { lv: 5, pct: '300%', tier: 'Platinum' },
  { lv: 6, pct: '500%', tier: 'Diamond' },
  { lv: 7, pct: '700%', tier: 'Master' },
  { lv: 8, pct: '1000%', tier: 'Grandmaster' },
];

const AVG_PROFIT = SINGLE_PROFIT; // 동일 등급/% 기준

const ACTIVITY = [
  { lv: 1, tier: 'Stone' },
  { lv: 2, tier: 'Bronze' },
  { lv: 3, tier: 'Silver' },
  { lv: 4, tier: 'Gold' },
  { lv: 5, tier: 'Diamond' },
];

const SPECIAL = [
  { file: 'special-week-win', title: '주간 수익률 1위', desc: '주간 단일 1위 누적' },
  { file: 'special-month-win', title: '월간 수익률 1위', desc: '월간 단일 1위 누적' },
  { file: 'special-month-activity', title: '월간 활동 1위', desc: '월간 활동점수 1위' },
  { file: 'special-likes-50', title: '좋아요 50', desc: '단일 리포트 50 도달' },
  { file: 'special-likes-100', title: '좋아요 100', desc: '단일 리포트 100 도달' },
  { file: 'special-likes-500', title: '좋아요 500', desc: '단일 리포트 500 도달' },
  { file: 'special-views-1k', title: '조회 1K', desc: '단일 리포트 1,000 조회' },
  { file: 'special-views-10k', title: '조회 10K', desc: '단일 리포트 10,000 조회' },
  { file: 'special-anniv-1y', title: '가입 1주년', desc: '가입 후 1년 도달' },
  { file: 'special-beta', title: '베타테스터', desc: '서비스 초창기 가입자' },
  { file: 'special-streak-100', title: '연속 100일', desc: '출석 streak 100일' },
  { file: 'special-streak-365', title: '연속 365일', desc: '출석 streak 365일' },
  { file: 'special-top10-7d', title: 'TOP10 7일', desc: '수익률 TOP10 7일 연속' },
  { file: 'special-top10-30d', title: 'TOP10 30일', desc: '수익률 TOP10 30일 연속' },
];

// ────────────────────────────────────────────────
// 페이지
// ────────────────────────────────────────────────

interface SectionProps {
  title: string;
  desc: string;
  children: React.ReactNode;
}

function Section({ title, desc, children }: SectionProps) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted mb-5">{desc}</p>
      <div className="flex flex-wrap gap-4 items-start">{children}</div>
    </section>
  );
}

export default function BadgesDevPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-2xl font-bold mb-2">배지 PNG 만들 목록</h1>
      <div className="text-sm text-muted mb-2 space-y-1">
        <div>• 위치: <code className="font-mono text-foreground">public/badges/&lt;파일명&gt;.png</code></div>
        <div>• 사이즈: 1024×1024 (정사각형) · 배경 투명 PNG</div>
        <div>• 텍스트는 PNG 안에 넣지 말고 비워두기 (코드에서 텍스트 오버레이 예정)</div>
        <div>• 총 <strong className="text-foreground">35장</strong>: 단일 수익률 8 + 평균 수익률 8 + 활동 5 + 특별 업적 14</div>
      </div>
      <div className="text-xs text-muted mb-8 italic">파일을 만들 때마다 새로고침하면 placeholder 자리에 실제 이미지가 들어옵니다.</div>

      <Section
        title="① 단일 수익률 (8장)"
        desc="원형 메달. 한 리포트라도 해당 수익률 달성 시 획득. 레벨업할수록 색·장식 화려해짐."
      >
        {SINGLE_PROFIT.map((it) => (
          <BadgeSlot
            key={it.lv}
            filename={`single-${it.lv}.png`}
            title={`Lv${it.lv} · ${it.pct}`}
            desc={it.tier}
          />
        ))}
      </Section>

      <Section
        title="② 평균 수익률 (8장)"
        desc="원형 또는 다이아몬드형 — 단일과 구분되는 외곽 형태 추천. 평균 기준이라 더 어려움."
      >
        {AVG_PROFIT.map((it) => (
          <BadgeSlot
            key={it.lv}
            filename={`avg-${it.lv}.png`}
            title={`Lv${it.lv} · ${it.pct}`}
            desc={it.tier}
          />
        ))}
      </Section>

      <Section
        title="③ 활동 (5장)"
        desc="육각형 등 다른 외곽 추천. 리포트·출석·댓글·좋아요·좋아요받음 합산 점수."
      >
        {ACTIVITY.map((it) => (
          <BadgeSlot
            key={it.lv}
            filename={`activity-${it.lv}.png`}
            title={`Lv${it.lv}`}
            desc={it.tier}
          />
        ))}
      </Section>

      <Section
        title="④ 특별 업적 (14장)"
        desc="별형 등 다른 외곽 추천. 카테고리별 등급 색은 자유."
      >
        {SPECIAL.map((it) => (
          <BadgeSlot
            key={it.file}
            filename={`${it.file}.png`}
            title={it.title}
            desc={it.desc}
          />
        ))}
      </Section>
    </div>
  );
}
