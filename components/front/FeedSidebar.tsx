import Link from 'next/link';

// 홈 "모든 리포트" 옆 고정 사이드 — 글쓰기 유도 · 사이트 소개 · 바로가기

export default function FeedSidebar({ totalPosts }: { totalPosts: number }) {
  return (
    <div className="space-y-8">
      <section className="border-t-2 border-[var(--theme-border)] pt-3">
        <p className="kicker">개인 투자자 리포트</p>
        <h2 className="headline mt-1 text-[22px] leading-snug break-keep">
          여의도 리포트 말고, 당신의 매수 이유를 남기세요
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--theme-ink-soft)] break-keep">
          쓰는 순간의 가격이 박제되고, 그 뒤는 시장이 채점합니다. 6개월 뒤 누가 맞았는지 숫자로 확인하세요.
        </p>
        <Link href="/write" className="btn-accent mt-3 inline-block text-sm">
          리포트 쓰기 →
        </Link>
      </section>

      <section className="border-t border-[var(--theme-border)] pt-3">
        <h2 className="headline text-[18px]">AntStreet는</h2>
        <ul className="mt-2 space-y-2.5 text-sm leading-relaxed text-[var(--theme-ink-soft)]">
          <li>
            <span className="font-bold text-[var(--foreground)]">가격이 박제됩니다.</span> 글을 쓰는 순간의 가격이 기록되고 고칠 수 없습니다.
          </li>
          <li>
            <span className="font-bold text-[var(--foreground)]">시장이 채점합니다.</span> 이후 수익률이 매일 자동으로 갱신됩니다.
          </li>
          <li>
            <span className="font-bold text-[var(--foreground)]">기록이 실력이 됩니다.</span> 리포트와 수익으로 레벨이 오릅니다.
          </li>
        </ul>
        <p className="mt-3 text-xs text-[var(--theme-ink-soft)]">지금까지 {totalPosts.toLocaleString('ko-KR')}편의 리포트가 채점되고 있어요.</p>
      </section>

      <section className="border-t border-[var(--theme-border)] pt-3">
        <h2 className="headline text-[18px]">바로가기</h2>
        <ul className="mt-1 divide-y divide-[var(--theme-border-muted)] text-sm">
          {[
            { href: '/ranking', label: '리포트 · 투자자 랭킹', desc: '누적·기간 수익률 순위' },
            { href: '/guru-tracker', label: '구루 포트폴리오', desc: 'SEC 13F 분기 보유 종목' },
            { href: '/indicators', label: '경제지표', desc: 'VIX · 금리차 · CPI · M2' },
            { href: '/search', label: '종목 검색', desc: '한·미·일·중·홍콩 종목별 리포트' },
          ].map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="group flex items-baseline justify-between gap-3 py-2.5">
                <span className="font-bold group-hover:underline underline-offset-4">{l.label}</span>
                <span className="text-xs text-[var(--theme-ink-soft)]">{l.desc}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
