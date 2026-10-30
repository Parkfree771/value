import Link from 'next/link';

// 피드 중간에 끼우는 글쓰기 유도 — 신문의 "독자 투고" 박스처럼. (개미 캐릭터는 리디자인 후 다시)
export default function WriteCtaCard() {
  return (
    <aside className="border-y-2 border-[var(--theme-border)] py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
      <div className="flex-1 min-w-0">
        <p className="kicker">개인 투자자 리포트</p>
        <p className="headline mt-1 text-lg sm:text-xl leading-snug break-keep">
          여의도 리포트 말고, 당신의 매수 이유를 남기세요
        </p>
        <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed break-keep">
          쓰는 순간의 가격이 박제되고, 그 뒤는 시장이 채점합니다. 6개월 뒤 누가 맞았는지 숫자로 확인하세요.
        </p>
      </div>
      <Link href="/write" className="btn-accent self-start sm:self-center whitespace-nowrap text-sm">
        리포트 쓰기 →
      </Link>
    </aside>
  );
}
