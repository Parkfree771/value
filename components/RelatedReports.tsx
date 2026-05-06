import Link from 'next/link';
import { getRelatedReports } from '@/lib/feedData';
import Card from '@/components/Card';
import type { FeedPost } from '@/types/feed';

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
      ? 'text-red-600 dark:text-red-500'
      : rate < 0
      ? 'text-blue-600 dark:text-blue-500'
      : 'text-gray-500 dark:text-gray-400';

  const anchorTitle = anchorPrefix ? `${anchorPrefix} - ${post.title}` : post.title;

  return (
    <Link
      href={`/reports/${post.id}`}
      title={anchorTitle}
      className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--theme-border-muted)] last:border-b-0 hover:bg-[var(--theme-bg)] -mx-3 px-3 rounded transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
          {post.title}
        </div>
        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
          {post.stockName && (
            <>
              <span className="truncate">{post.stockName}</span>
              {post.ticker && <span className="font-mono text-gray-400">{post.ticker}</span>}
              <span className="text-gray-400">·</span>
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
    <nav aria-label="관련 리포트" className="space-y-4 sm:space-y-6">
      {sameTicker.length > 0 && stockName && (
        <Card className="px-3 py-3 sm:px-5 sm:py-4">
          <h2 className="text-sm sm:text-base font-bold mb-3 text-gray-900 dark:text-white">
            {stockName} 관련 다른 리포트
          </h2>
          <div className="space-y-0">
            {sameTicker.map((post) => (
              <ReportLinkRow key={post.id} post={post} anchorPrefix={stockName} />
            ))}
          </div>
        </Card>
      )}

      {sameAuthor.length > 0 && author && (
        <Card className="px-3 py-3 sm:px-5 sm:py-4">
          <h2 className="text-sm sm:text-base font-bold mb-3 text-gray-900 dark:text-white">
            {author}님의 다른 분석 글
          </h2>
          <div className="space-y-0">
            {sameAuthor.map((post) => (
              <ReportLinkRow key={post.id} post={post} anchorPrefix={author} />
            ))}
          </div>
        </Card>
      )}

      {sameTheme.length > 0 && themeLabel && (
        <Card className="px-3 py-3 sm:px-5 sm:py-4">
          <h2 className="text-sm sm:text-base font-bold mb-3 text-gray-900 dark:text-white">
            #{themeLabel} 테마 리포트
          </h2>
          <div className="space-y-0">
            {sameTheme.map((post) => (
              <ReportLinkRow key={post.id} post={post} anchorPrefix={themeLabel} />
            ))}
          </div>
        </Card>
      )}

      {popular.length > 0 && (
        <Card className="px-3 py-3 sm:px-5 sm:py-4">
          <h2 className="text-sm sm:text-base font-bold mb-3 text-gray-900 dark:text-white">
            지금 인기 있는 리포트
          </h2>
          <div className="space-y-0">
            {popular.map((post) => (
              <ReportLinkRow key={post.id} post={post} />
            ))}
          </div>
        </Card>
      )}
    </nav>
  );
}
