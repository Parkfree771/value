import type { Metadata } from 'next';
import Link from 'next/link';
import InstagramKit from '@/components/briefing/InstagramKit';
import { getBriefing } from '@/lib/briefing';

// 헤드라인 (/briefing) — 매일 새벽 scripts/news 배치가 해외 매체 헤드라인으로 이슈를 고르고, AI 가 직접 조사해 새로 쓴 결과.
// 홈 HEADLINES 지면과 같은 모양: 빨간 띠 + 첫 기사 크게 + 나머지 기사.
// 배치가 끝나면 /api/revalidate 로 이 페이지를 갱신한다. 그 사이엔 15분 ISR.
export const revalidate = 900;

export const metadata: Metadata = {
  title: '오늘의 헤드라인 — 오늘 아침 꼭 알아야 할 경제 이슈 10',
  description: '밤사이 경제·시장 뉴스를 오늘 아침 꼭 알아야 할 이슈 10개로 정리합니다.',
  alternates: { canonical: '/briefing' },
};

const DATE_SHORT = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' });
const DATE_KR = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
const TIME_KR = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false });

const MASTHEAD = 'font-[family-name:var(--font-masthead)] font-extrabold text-white';

export default async function BriefingPage() {
  const briefing = await getBriefing();
  const [top, ...rest] = briefing?.issues ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-8 sm:py-8">
      <header>
        <div className="-mx-4 sm:mx-0 flex items-baseline justify-between gap-3 bg-[var(--theme-press-red)] px-4 py-2.5">
          <h1 className={`${MASTHEAD} text-[18px] sm:text-[20px] tracking-[0.12em]`}>HEADLINES</h1>
          {briefing && (
            <span suppressHydrationWarning className={`${MASTHEAD} text-[18px] sm:text-[20px] tabular-nums`}>
              {DATE_SHORT.format(new Date(briefing.generatedAt))}
            </span>
          )}
        </div>
        {briefing && (
          <p suppressHydrationWarning className="mt-2 text-xs text-[var(--theme-ink-soft)]">
            {DATE_KR.format(new Date(briefing.generatedAt))} {TIME_KR.format(new Date(briefing.generatedAt))} 발행
            {briefing.isStale && ' · 지난 호'}
          </p>
        )}
      </header>

      <InstagramKit />

      {top ? (
        <>
          <article className="py-6 border-b-2 border-[var(--theme-border)]">
            {top.tags && top.tags.length > 0 && <p className="kicker">{top.tags.join(' · ')}</p>}
            <h2 className="headline mt-1 text-[28px] sm:text-[36px] leading-[1.25] break-keep">{top.headline}</h2>
            <p className="mt-3 font-serif text-[16px] sm:text-[17px] leading-relaxed break-keep">{top.summary}</p>
          </article>
          <div>
            {rest.map((issue, i) => (
              <article key={i} className="py-5 border-b border-[var(--theme-border-muted)]">
                {issue.tags && issue.tags.length > 0 && <p className="kicker">{issue.tags.join(' · ')}</p>}
                <h2 className="headline mt-0.5 text-[19px] sm:text-[22px] leading-snug break-keep">{issue.headline}</h2>
                <p className="mt-2 text-[15px] leading-relaxed break-keep text-[var(--theme-ink-soft)]">{issue.summary}</p>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="py-16 text-center text-[var(--theme-ink-soft)]">
          매일 아침 6시, 오늘 꼭 알아야 할 경제 이슈 10개를 정리해 드립니다. 첫 호를 준비하고 있어요.
        </p>
      )}

      <footer className="mt-6 text-xs leading-relaxed text-[var(--theme-ink-soft)]">
        <p>AI가 공개 자료를 조사해 작성한 기사입니다. 오류가 있을 수 있으며, 투자 권유가 아닙니다.</p>
        <p className="mt-3">
          <Link href="/" className="inline-flex min-h-9 items-center font-bold hover:underline sm:inline sm:min-h-0">← 홈으로</Link>
        </p>
      </footer>
    </div>
  );
}
