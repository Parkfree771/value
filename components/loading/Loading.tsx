// 로딩 화면 — 에디토리얼 테마
// 스피너 대신 "인쇄되는 괘선"(얇은 잉크 줄이 지나감) + 실제 지면 모양의 회색 뼈대.
// 상자 없이 괘선으로 구획 — 페이지가 뜨면 같은 자리에 같은 모양으로 채워진다.

/** 얇은 잉크 줄이 좌→우로 지나가는 로딩 표시 + 작은 라벨 */
export function PressBar({ label = '지면을 준비하고 있어요', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={className} role="status" aria-live="polite">
      <div className="press-bar" />
      <p className="mt-2 text-[11px] font-bold tracking-[0.14em] text-[var(--theme-ink-soft)]">{label}</p>
    </div>
  );
}

/** 회색 막대 (텍스트 자리) */
export function Skel({ className = '' }: { className?: string }) {
  return <div className={`skel ${className}`} aria-hidden="true" />;
}

/** 범용 — 페이지 제목 + 문단 몇 줄 */
export function PageLoading({ label, title = true }: { label?: string; title?: boolean }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PressBar label={label} />
      {title && (
        <div className="mt-8 border-t-2 border-[var(--theme-border)] pt-4">
          <Skel className="h-8 w-2/3 sm:w-1/2" />
          <Skel className="mt-3 h-3 w-1/3" />
        </div>
      )}
      <div className="mt-8 space-y-3">
        <Skel className="h-3 w-full" />
        <Skel className="h-3 w-11/12" />
        <Skel className="h-3 w-4/5" />
        <Skel className="h-3 w-3/5" />
      </div>
    </div>
  );
}

/** 화면 일부(탭 내용 등)용 — 라벨만 있는 작은 로딩 */
export function InlineLoading({ label }: { label?: string }) {
  return (
    <div className="py-12 flex justify-center">
      <PressBar label={label} className="w-48" />
    </div>
  );
}

/** 순위 행 뼈대 */
function RowSkel({ count }: { count: number }) {
  return (
    <div className="border-t-2 border-[var(--theme-border)]">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="grid grid-cols-[1.75rem_1fr_4rem] items-center gap-3 py-3 border-b border-[var(--theme-border-muted)]">
          <Skel className="h-5 w-4" />
          <div>
            <Skel className="h-3.5 w-3/4" />
            <Skel className="mt-1.5 h-2.5 w-1/3" />
          </div>
          <Skel className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

/** 1·2·3위 카드 뼈대 */
function PodiumSkel() {
  return (
    <div className="grid gap-y-8 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`md:px-5 ${i === 0 ? 'md:pl-0' : ''} ${i === 2 ? 'md:pr-0' : 'md:border-r md:border-[var(--theme-border-muted)]'}`}>
          <div className="flex items-end justify-between border-b border-[var(--theme-border-muted)] pb-2">
            <Skel className="h-9 w-6" />
            <Skel className="h-6 w-24" />
          </div>
          <Skel className="mt-3 aspect-[2/1] w-full" />
          <Skel className="mt-3 h-2.5 w-1/3" />
          <Skel className="mt-2 h-4 w-full" />
          <Skel className="mt-1.5 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** 홈 1면 */
export function HomeSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <div className="border-b border-[var(--theme-border-muted)] py-2.5 flex gap-6 overflow-hidden">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skel key={i} className="h-3 w-24 flex-shrink-0" />
        ))}
      </div>
      <PressBar className="mt-5" />
      <div className="mt-5 grid gap-y-10 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8 lg:pr-8">
          <Skel className="h-2.5 w-24" />
          <Skel className="mt-2 h-8 w-48" />
          <div className="mt-5">
            <PodiumSkel />
          </div>
          <div className="mt-5">
            <RowSkel count={6} />
          </div>
        </div>
        <div className="min-w-0 lg:col-span-4 lg:pl-8 lg:border-l lg:border-[var(--theme-border-muted)]">
          <Skel className="h-2.5 w-20" />
          <Skel className="mt-2 h-6 w-32" />
          <div className="mt-3 border-t-2 border-[var(--theme-border)]">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="py-3 border-b border-[var(--theme-border-muted)]">
                <Skel className="h-3.5 w-full" />
                <Skel className="mt-1.5 h-3.5 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 리포트 상세 — 제목 · 바이라인 · 수익률 표 · 본문 */
export function ReportSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <PressBar label="리포트를 펼치는 중" />
      <div className="mt-6">
        <Skel className="h-2.5 w-28" />
        <Skel className="mt-3 h-8 w-full" />
        <Skel className="mt-2 h-8 w-2/3" />
        <Skel className="mt-4 h-3 w-1/3" />
      </div>
      <div className="mt-6 grid grid-cols-3 border-y-2 border-[var(--theme-border)] divide-x divide-[var(--theme-border-muted)]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-3">
            <Skel className="h-2.5 w-12" />
            <Skel className="mt-2 h-5 w-20" />
          </div>
        ))}
      </div>
      <Skel className="mt-6 h-48 w-full" />
      <div className="mt-6 space-y-3">
        <Skel className="h-3 w-full" />
        <Skel className="h-3 w-11/12" />
        <Skel className="h-3 w-full" />
        <Skel className="h-3 w-3/4" />
      </div>
    </div>
  );
}

/** 랭킹 페이지 */
export function RankingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <PressBar label="순위를 집계하는 중" />
      <div className="mt-6 flex flex-col items-center">
        <Skel className="h-7 w-24" />
        <div className="mt-4 flex gap-4">
          <Skel className="h-6 w-16" />
          <Skel className="h-6 w-16" />
          <Skel className="h-6 w-16" />
        </div>
      </div>
      <div className="mt-8">
        <RowSkel count={8} />
      </div>
    </div>
  );
}

/** 구루 포트폴리오 — 머리글 + 보유 종목 표 */
export function PortfolioSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <PressBar label="13F 공시를 읽는 중" />
      <div className="mt-6 border-t-2 border-[var(--theme-border)] pt-4">
        <Skel className="h-2.5 w-20" />
        <Skel className="mt-2 h-9 w-64" />
        <Skel className="mt-3 h-3 w-1/2" />
      </div>
      <div className="mt-8">
        <RowSkel count={8} />
      </div>
    </div>
  );
}
