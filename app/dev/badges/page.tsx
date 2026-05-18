'use client';

import { useState, memo } from 'react';
import {
  BADGES_BY_CATEGORY,
  CATEGORY_LABEL,
  CATEGORY_DESC,
  type BadgeDef,
  type BadgeCategory,
} from '@/lib/badges';

// ────────────────────────────────────────────────
// 배지 미리보기 페이지
// ────────────────────────────────────────────────
// public/badges/<id>.png 파일이 있으면 placeholder가 자동으로 실제 이미지로 바뀜.
// special 카테고리는 PNG 미제작 — 텍스트 placeholder만 표시.

const CATEGORIES: BadgeCategory[] = ['single', 'avg', 'activity'];

// ────────────────────────────────────────────────
// 큰 사이즈 슬롯 (갤러리용)
// ────────────────────────────────────────────────

interface BigSlotProps {
  badge: BadgeDef;
}

const BigSlot = memo(function BigSlot({ badge }: BigSlotProps) {
  const [error, setError] = useState(false);
  return (
    <div className="flex flex-col items-center gap-2 w-[128px]">
      <div className="relative w-24 h-24 bg-[var(--theme-bg-card)] border-2 border-dashed border-slate-400 dark:border-slate-500 rounded-lg overflow-hidden flex items-center justify-center">
        {!error ? (
          <img
            src={`/badges/${badge.id}.png`}
            alt={badge.id}
            className="w-full h-full object-contain"
            onError={() => setError(true)}
          />
        ) : (
          <span className="text-[9px] text-gray-400 text-center px-1">파일 없음</span>
        )}
      </div>
      <div className="text-center w-full">
        <div className="text-xs font-bold text-foreground">{badge.name}</div>
        <div className="text-[10px] text-muted leading-tight mt-0.5">{badge.description}</div>
        <div className="text-[9px] font-mono text-gray-400 mt-1 break-all">{badge.id}.png</div>
      </div>
    </div>
  );
});

// ────────────────────────────────────────────────
// 인라인 사이즈 행 (실제 카드 작성자 영역 시뮬레이션)
// ────────────────────────────────────────────────

interface InlineRowProps {
  badge: BadgeDef;
  size: number;
}

const InlineRow = memo(function InlineRow({ badge, size }: InlineRowProps) {
  return (
    <div className="flex items-center gap-1 border-2 border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-[var(--theme-bg-card)]">
      <img
        src={`/badges/${badge.id}.png`}
        alt={badge.id}
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'contain' }}
        className="-mr-1"
      />
      <span className="font-bold text-sm text-foreground">Boltzmann</span>
      <span className="text-[10px] font-mono text-gray-400 ml-1">{badge.id}</span>
    </div>
  );
});

// ────────────────────────────────────────────────
// 카테고리 섹션
// ────────────────────────────────────────────────

function CategorySection({ category }: { category: BadgeCategory }) {
  const badges = BADGES_BY_CATEGORY[category];
  const label = CATEGORY_LABEL[category];
  const desc = CATEGORY_DESC[category];

  return (
    <section className="mb-12">
      <h2 className="text-xl font-bold text-foreground">{label} <span className="text-sm font-normal text-muted">({badges.length}장)</span></h2>
      <p className="text-sm text-muted mb-5">{desc}</p>

      {/* 큰 사이즈 갤러리 */}
      <div className="flex flex-wrap gap-4 items-start mb-6">
        {badges.map((b) => <BigSlot key={b.id} badge={b} />)}
      </div>

      {/* 인라인 사이즈 미리보기 */}
      {true && (
        <div>
          <div className="text-xs font-bold text-muted mb-2">인라인 사이즈 (피드 카드 28px / TOP10 30px)</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {badges.map((b) => <InlineRow key={`${b.id}-28`} badge={b} size={28} />)}
          </div>
        </div>
      )}
    </section>
  );
}

// ────────────────────────────────────────────────
// 페이지
// ────────────────────────────────────────────────

export default function BadgesDevPage() {
  const total = CATEGORIES.reduce((sum, c) => sum + BADGES_BY_CATEGORY[c].length, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-2xl font-bold mb-2">배지 시스템 (임시 미리보기)</h1>
      <div className="text-sm text-muted mb-2 space-y-1">
        <div>• 위치: <code className="font-mono text-foreground">public/badges/&lt;id&gt;.png</code></div>
        <div>• 사이즈: 1024×1024 정사각형 · 투명 PNG (마젠타 배경은 <code className="font-mono text-foreground">scripts/strip-badge-magenta.js</code>로 자동 제거)</div>
        <div>• 텍스트는 PNG 안에 넣지 말 것 (코드에서 메타데이터로 표시)</div>
        <div>• 총 <strong className="text-foreground">{total}장</strong>: 단일 8 + 평균 8 + 활동 5 + 특별 14</div>
        <div>• 실제 사이트(피드/랭킹/글 상세)는 아직 <strong className="text-foreground">옛 배지 시스템</strong> 사용 중 — 이 페이지가 임시 적용 자리</div>
      </div>
      <div className="text-xs text-muted mb-8 italic">파일을 추가/교체하면 새로고침 시 placeholder 자리에 자동 반영됩니다.</div>

      {CATEGORIES.map((cat) => <CategorySection key={cat} category={cat} />)}
    </div>
  );
}
