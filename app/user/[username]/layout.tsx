import type { Metadata } from 'next';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { sql } from '@/lib/db';
import { SAFETY_TTL, TAG } from '@/lib/cache';
import { formatRate, ogCardUrl } from '@/lib/metadata';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

// 메타데이터에 평균 수익률·승률이 들어간다 — 프로필 데이터는 태그 posts 캐시라
// 글 작성·수정·삭제, 장 마감 수집 때 함께 비워진다 (lib/cache.ts). 하루짜리 안전장치만 둔다.
export const revalidate = 86400;

// 미리 만들어 두지 않고 처음 방문 때 만든 뒤 캐시 (ISR) — 빈 목록이어야 동적 URL 도 캐시된다.
// 갱신은 데이터가 바뀔 때 신호로 (lib/cache.ts)
export function generateStaticParams() {
  return [];
}

interface ProfileSeo {
  nickname: string;
  bio: string;
  totalReports: number;
  avgReturnRate: number;
  maxReturnRate: number;
  winRate: number;
  totalLikes: number;
  /** 수익률 상위 리포트 — 설명·구조화 데이터용 */
  topReports: { id: string; title: string; stockName: string; returnRate: number }[];
}

// 데이터 캐시(태그 posts) + generateMetadata 와 레이아웃(JSON-LD)이 같은 요청에서 한 번만 조회하도록 cache()
const getProfileSeo = cache(async (nickname: string): Promise<ProfileSeo | null> => {
  try {
    return await readProfileSeo(nickname);
  } catch (e) {
    console.error('[user layout] 프로필 조회 실패', e);
    return null;
  }
});

const readProfileSeo = unstable_cache(
  async (nickname: string): Promise<ProfileSeo | null> => {
    const users = await sql`
      select id, nickname, bio from users
      where nickname = ${nickname} and coalesce(is_suspended, false) = false
      limit 1
    `;
    const user = users[0];
    if (!user) return null;

    const [statsRows, topRows] = await Promise.all([
      sql`
        select total_reports, avg_return_rate, max_return_rate, win_rate, total_likes
        from user_stats where author_id = ${user.id}
      `.catch(() => [] as Record<string, any>[]),
      sql`
        select id, title, stock_name, return_rate from posts
        where author_id = ${user.id}
        order by return_rate desc nulls last
        limit 5
      `.catch(() => [] as Record<string, any>[]),
    ]);
    const st = statsRows[0];
    return {
      nickname: user.nickname,
      bio: user.bio || '',
      totalReports: Number(st?.total_reports ?? 0),
      avgReturnRate: Number(st?.avg_return_rate ?? 0),
      maxReturnRate: Number(st?.max_return_rate ?? 0),
      winRate: Number(st?.win_rate ?? 0),
      totalLikes: Number(st?.total_likes ?? 0),
      topReports: topRows.map((r) => ({
        id: r.id,
        title: r.title ?? '',
        stockName: r.stock_name ?? '',
        returnRate: Number(r.return_rate ?? 0),
      })),
    };
  },
  ['profile-seo'],
  { tags: [TAG.posts], revalidate: SAFETY_TTL },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const nickname = decodeURIComponent(username);
  const url = `${SITE_URL}/user/${encodeURIComponent(nickname)}`;
  const p = await getProfileSeo(nickname);

  if (!p) {
    return {
      title: '투자자를 찾을 수 없습니다',
      robots: { index: false, follow: true },
    };
  }

  const hasReports = p.totalReports > 0;
  // 제목: 닉네임 투자 리포트 · 평균 수익률 +12.3% · 승률 62%
  const title = hasReports
    ? `${p.nickname} 투자 리포트 ${p.totalReports}개 · 평균 수익률 ${formatRate(p.avgReturnRate)} · 승률 ${Math.round(p.winRate)}%`
    : `${p.nickname}의 투자 프로필`;

  const best = p.topReports[0];
  const description = hasReports
    ? [
        `${p.nickname} 투자자의 리포트 ${p.totalReports}개, 평균 수익률 ${formatRate(p.avgReturnRate)}, 승률 ${Math.round(p.winRate)}%.`,
        best ? `최고 수익률 ${formatRate(best.returnRate)} — ${best.stockName || best.title}.` : '',
        '작성가 대비 현재가로 자동 검증된 기록입니다.',
        p.bio ? p.bio.slice(0, 60) : '',
      ]
        .filter(Boolean)
        .join(' ')
    : `${p.nickname} 투자자의 프로필. AntStreet에서 투자 아이디어를 공유하고 작성가 대비 수익률로 매일 검증받는 투자자입니다.`;

  const ogImage = ogCardUrl({
    kicker: '투자자 프로필',
    title: p.nickname,
    sub: hasReports ? `리포트 ${p.totalReports}개 · 작성가 대비 매일 검증` : 'AntStreet 투자자',
    metrics: hasReports
      ? [
          { label: '평균 수익률', value: formatRate(p.avgReturnRate) },
          { label: '승률', value: `${Math.round(p.winRate)}%` },
          { label: '최고 수익률', value: formatRate(p.maxReturnRate) },
        ]
      : [],
  });

  return {
    title,
    description,
    keywords: [p.nickname, `${p.nickname} 리포트`, `${p.nickname} 수익률`, '투자자 프로필', '수익률 인증', 'AntStreet'],
    openGraph: {
      type: 'profile',
      title,
      description,
      url,
      siteName: 'AntStreet',
      locale: 'ko_KR',
      username: p.nickname,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${p.nickname} 투자 프로필` }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    // 리포트가 없는 빈 프로필은 검색결과에 내보낼 내용이 없다
    robots: hasReports ? undefined : { index: false, follow: true },
    alternates: { canonical: url },
  };
}

export default async function UserLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const nickname = decodeURIComponent(username);
  const p = await getProfileSeo(nickname);
  const url = `${SITE_URL}/user/${encodeURIComponent(nickname)}`;

  const jsonLd = p && {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${url}#profile`,
    url,
    inLanguage: 'ko-KR',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: {
      '@type': 'Person',
      name: p.nickname,
      ...(p.bio ? { description: p.bio } : {}),
      url,
      interactionStatistic: [
        { '@type': 'InteractionCounter', interactionType: 'https://schema.org/WriteAction', userInteractionCount: p.totalReports },
        { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: p.totalLikes },
      ],
      additionalProperty: [
        { '@type': 'PropertyValue', name: '평균 수익률', value: formatRate(p.avgReturnRate) },
        { '@type': 'PropertyValue', name: '승률', value: `${Math.round(p.winRate)}%` },
        { '@type': 'PropertyValue', name: '최고 수익률', value: formatRate(p.maxReturnRate) },
      ],
    },
    ...(p.topReports.length
      ? {
          hasPart: p.topReports.map((r) => ({
            '@type': 'Article',
            headline: r.title.slice(0, 110),
            url: `${SITE_URL}/reports/${r.id}`,
            author: { '@type': 'Person', name: p.nickname, url },
            abstract: `${r.stockName} 수익률 ${formatRate(r.returnRate)}`,
          })),
        }
      : {}),
  };

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      {children}
    </>
  );
}
