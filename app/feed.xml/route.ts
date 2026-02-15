import { getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export async function GET() {
  let items = '';

  try {
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(postsQuery);

    items = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const title = escapeXml(data.title || '무제');
        const author = escapeXml(data.authorName || '익명');
        const stockName = escapeXml(data.stockName || '');
        const ticker = escapeXml(data.ticker || '');
        const opinion = data.opinion || '';
        const link = `${SITE_URL}/reports/${doc.id}`;

        // 날짜 처리
        let pubDate = new Date().toUTCString();
        if (data.createdAt?.toDate) {
          pubDate = data.createdAt.toDate().toUTCString();
        } else if (typeof data.createdAt === 'string') {
          pubDate = new Date(data.createdAt).toUTCString();
        }

        // 설명 생성
        const opinionText = opinion === 'buy' ? '매수' : opinion === 'sell' ? '매도' : '중립';
        const description = escapeXml(
          `[${opinionText}] ${stockName}(${ticker}) - ${data.content?.replace(/<[^>]*>/g, '').slice(0, 200) || ''}`
        );

        return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${author}</dc:creator>
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
