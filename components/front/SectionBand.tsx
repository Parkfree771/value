import type { ReactNode } from 'react';

// 모바일 구역 머리띠 — HEADLINES 띠와 같은 어두운 빨강. 화면 끝까지 꽉 차서 구역이 바뀌는 게 한눈에 보인다.
// PC는 기존 제목을 쓰고 이 띠는 숨긴다.
export default function SectionBand({ label, right }: { label: string; right?: ReactNode }) {
  return (
    <div className="md:hidden -mx-4 sm:-mx-6 flex items-baseline justify-between gap-3 bg-[var(--theme-press-red)] px-4 sm:px-6 py-2 text-white">
      <h2 className="font-[family-name:var(--font-masthead)] text-[15px] font-extrabold tracking-[0.12em]">{label}</h2>
      {right && <span className="text-xs font-bold tabular-nums">{right}</span>}
    </div>
  );
}
