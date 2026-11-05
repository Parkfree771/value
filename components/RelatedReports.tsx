import Link from 'next/link';
import { getRelatedReports } from '@/lib/feedData';
import type { FeedPost } from '@/types/feed';
import { shortStockName } from '@/utils/reportDisplay';

const THEME_NAMES: Record<string, string> = {
  'physical-ai': '피지컬AI',
  'quantum-computing': '양자컴퓨터',
  'secondary-battery': '2차전지',
  'ai-semiconductor': 'AI반도체',
  'robotics': '로봇',
  'autonomous-driving': '자율주행',
  'bio-healthcare': '바이오/헬스케어',
  'space-aerospace': '우주항공',
  'nuclear-energy': '원자력',
  'defense': '방산',
};

interface Props {
  currentId: string;
  ticker: string;
  stockName: string;
  author: string;
  themes?: string[];
}

function ReportLinkRow({ post, anchorPrefix }: { post: FeedPost; anchorPrefix?: string }) {
  const rate = post.returnRate || 0;
  const rateColor =
    rate > 0
      ? 'text-[var(--color-up)]'
      : rate < 0
      ? 'text-[var(--color-down)]'
      : 'text-[var(--theme-ink-soft)]';

  const anchorTitle = anchorPrefix ? `${anchorPrefix} - ${post.title}` : post.title;

  return (
    <Link
      href={`/reports/${post.id}`}
      title={anchorTitle}
      className="group flex items-center justify-between gap-3 py-2.5 border-b border-[var(--theme-border-muted)] last:border-b-0"
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] sm:text-sm font-semibold text-[var(--foreground)] truncate group-hover:underline underline-offset-4">
          {post.title}
        </div>
        <div className="text-[11px] sm:text-xs text-[var(--theme-ink-soft)] mt-0.5 flex items-center gap-1.5">
          {post.stockName && (
            <>
              <span className="truncate">{shortStockName(post.stockName, post.ticker)}</span>
              {post.ticker && <span className="font-mono text-[var(--theme-ink-soft)]">{post.ticker}</span>}
              <span className="text-[var(--theme-ink-soft)]">·</span>
            </>
          )}
          <span className="truncate">{post.author}</span>
        </div>
      </div>
      <span className={`text-xs sm:text-sm font-bold font-mono tabular-nums flex-shrink-0 ${rateColor}`}>
        {rate > 0 ? '+' : ''}{rate.toFixed(2)}%
      </span>
    </Link>
  );
}

export default async function RelatedReports({
  currentId,
  ticker,
  stockName,
  author,
  themes,
}: Props) {
  const { sameTicker, sameAuthor, sameTheme, popular } = await getRelatedReports(
    currentId,
    ticker,
    author,
    themes,
  );

  if (
    sameTicker.length === 0 &&
    sameAuthor.length === 0 &&
    sameTheme.length === 0 &&
    popular.length === 0
  ) {
    return null;
  }

  const themeLabel = themes && themes.length > 0 ? THEME_NAMES[themes[0]] || themes[0] : null;

  return (
    <nav aria-label="관련 리포트" className="space-y-6 sm:space-y-8">
      {sameTicker.length > 0 && stockName && (
        <section className="border-t-2 border-[var(--theme-border)] pt-2.5">
          <h2 className="headline text-[16px] sm:text-[18px] mb-1">
            {stockName} 관련 다른 리포트
          </h2>
          <div className="space-y-0">
            {sameTicker.map((post) => (
              <ReportLinkRow key={post.id} post={post} anchorPrefix={stockName} />
            ))}
          </div>
        </section>
      )}

      {sameAuthor.length > 0 && author && (
        <section className="border-t-2 border-[var(--theme-border)] pt-2.5">
          <h2 className="headline text-[16px] sm:text-[18px] mb-1">
            {author}님의 다른 분석 글
          </h2>
          <div className="space-y-0">
            {sameAuthor.map((post) => (
              <ReportLinkRow key={post.id} post={post} anchorPrefix={author} />
            ))}
          </div>
        </section>
      )}

      {sameTheme.length > 0 && themeLabel && (
        <section className="border-t-2 border-[var(--theme-border)] pt-2.5">
          <h2 className="headline text-[16px] sm:text-[18px] mb-1">
            #{themeLabel} 테마 리포트
          </h2>
          <div className="space-y-0">
            {sameTheme.map((post) => (
              <ReportLinkRow key={post.id} post={post} anchorPrefix={themeLabel} />
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section className="border-t-2 border-[var(--theme-border)] pt-2.5">
          <h2 className="headline text-[16px] sm:text-[18px] mb-1">
            지금 인기 있는 리포트
          </h2>
          <div className="space-y-0">
            {popular.map((post) => (
              <ReportLinkRow key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
    </nav>
  );
}
