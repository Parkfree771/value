// RSS feed (XML). Supabase posts에서 최신 50개.

import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export async function GET() {
  let items = '';

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: posts } = await supabase
      .from('posts')
      .select(
        'id, title, stock_name, ticker, opinion, content, created_at, author:users!posts_author_id_fkey(nickname)',
      )
      .order('created_at', { ascending: false })
      .limit(50);

    items = (posts ?? [])
      .map((p) => {
        const author = (p as { author?: { nickname?: string } | null }).author;
        const title = escapeXml(p.title || '무제');
        const authorName = escapeXml(author?.nickname || '익명');
        const stockName = escapeXml(p.stock_name || '');
        const ticker = escapeXml(p.ticker || '');
        const opinion = p.opinion || '';
        const link = `${SITE_URL}/reports/${p.id}`;
        const pubDate = p.created_at ? new Date(p.created_at).toUTCString() : new Date().toUTCString();
        const opinionText = opinion === 'buy' ? '매수' : opinion === 'sell' ? '매도' : '중립';
        const description = escapeXml(
          `[${opinionText}] ${stockName}(${ticker}) - ${(p.content || '').replace(/<[^>]*>/g, '').slice(0, 200)}`,
        );

        return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${authorName}</dc:creator>
      <description>${description}</description>
      <category>${stockName} (${ticker})</category>
    </item>`;
      })
      .join('\n');
  } catch (error) {
    console.error('RSS 피드 생성 실패:', error);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AntStreet - 개미 투자자들의 리포트 공유 플랫폼</title>
    <link>${SITE_URL}</link>
    <description>개미 투자자들의 집단 지혜를 모으는 곳. 투자 아이디어를 공유하고 수익률을 추적하세요.</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
