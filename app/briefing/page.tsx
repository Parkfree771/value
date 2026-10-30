import type { Metadata } from 'next';
import Link from 'next/link';
import InstagramKit from '@/components/briefing/InstagramKit';
import { getBriefing } from '@/lib/briefing';

// 모닝 브리핑 — 매일 새벽 scripts/news 배치가 해외 매체 RSS 를 모아 경제 이슈 10개로 새로 쓴 결과.
// 배치가 끝나면 /api/revalidate 로 이 페이지를 갱신한다. 그 사이엔 15분 ISR.
export const revalidate = 900;

export const metadata: Metadata = {
  title: '모닝 브리핑 — 오늘 아침 꼭 알아야 할 경제 이슈 10',
  description: '밤사이 해외 주요 매체가 다룬 경제·시장 뉴스를 모아, 오늘 아침 꼭 알아야 할 이슈 10개로 정리합니다.',
  alternates: { canonical: '/briefing' },
};

const DATE_KR = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
const TIME_KR = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false });

export default async function BriefingPage() {
  const briefing = await getBriefing();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <header className="text-center border-b-2 border-[var(--theme-border)] pb-5">
        <p className="kicker">매일 아침 6시</p>
        <h1 className="headline text-4xl sm:text-5xl mt-1">모닝 브리핑</h1>
        {briefing ? (
          <p suppressHydrationWarning className="mt-3 text-sm text-[var(--theme-ink-soft)]">
            {DATE_KR.format(new Date(briefing.generatedAt))} · {TIME_KR.format(new Date(briefing.generatedAt))} 발행 · 해외 기사{' '}
            {briefing.sourceArticles.toLocaleString('ko-KR')}건 종합
            {briefing.isStale && ' · 지난 호'}
          </p>
        ) : null}
      </header>

      <InstagramKit />

      {briefing ? (
        <ol>
          {briefing.issues.map((issue, i) => (
            <li key={i} className="flex gap-4 sm:gap-6 py-6 border-b border-[var(--theme-border-muted)]">
              <span className="flex-shrink-0 w-8 sm:w-10 font-serif font-black text-3xl sm:text-4xl leading-none text-[var(--theme-orange)] tabular-nums">
                {i + 1}
              </span>
              <article className="min-w-0">
                {issue.tags && issue.tags.length > 0 && (
                  <p className="kicker">{issue.tags.join(' · ')}</p>
                )}
                <h2 className="headline text-xl sm:text-2xl leading-snug break-keep mt-0.5">{issue.headline}</h2>
                <p className="mt-2.5 text-[15px] sm:text-base leading-relaxed break-keep">{issue.summary}</p>
                {issue.covered_by && issue.covered_by.length > 0 && (
                  <p className="mt-2.5 text-xs text-[var(--theme-ink-soft)]">
                    {issue.covered_by.length}개 매체 보도 · {issue.covered_by.slice(0, 6).join(', ')}
                    {issue.covered_by.length > 6 && ' 외'}
                  </p>
                )}
              </article>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-16 text-center text-[var(--theme-ink-soft)]">
          밤사이 해외 주요 매체 기사를 모아 아침 6시에 경제 이슈 10개로 정리해 드립니다. 첫 호를 준비하고 있어요.
        </p>
      )}

      <footer className="mt-8 text-xs leading-relaxed text-[var(--theme-ink-soft)]">
        <p>
          해외 주요 매체의 보도에서 사실만 모아 AntStreet 가 새로 쓴 요약입니다. 원문 기사를 옮긴 것이 아니며, 투자 권유가 아닙니다.
        </p>
        <p className="mt-3">
          <Link href="/" className="font-bold hover:underline">← 홈으로</Link>
        </p>
      </footer>
    </div>
  );
}
