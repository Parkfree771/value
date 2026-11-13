import { MetadataRoute } from 'next';
import { sql } from '@/lib/db';
import { GURU_LIST } from './guru-tracker/types';
import { loadGuruPortfolios } from '@/lib/sec13f/portfolioSummary';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

// 크롤러가 올 때마다 전체 글을 읽지 않도록 캐시 — 글 작성·수정·삭제 때 invalidatePosts() 가 즉시 다시 만든다 (lib/cache.ts)
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/reports`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/ranking`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/briefing`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/guru-tracker`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/indicators`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/disclaimer`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  let reportPages: MetadataRoute.Sitemap = [];
  let userPages: MetadataRoute.Sitemap = [];

  try {
    const posts = await sql`
      select p.id, p.created_at, p.updated_at, u.nickname as author_nickname
      from posts p
      left join users u on u.id = p.author_id
    `;

    const nicknames = new Set<string>();
    reportPages = posts.map((p) => {
      // updated_at은 timestamptz[] — 마지막 원소가 최종 수정 시각
      const updatedArr = (p.updated_at as (string | Date)[] | null) ?? [];
      const lastIso =
        updatedArr.length > 0 ? updatedArr[updatedArr.length - 1] : p.created_at;
      if (p.author_nickname) nicknames.add(p.author_nickname);

      return {
        url: `${SITE_URL}/reports/${p.id}`,
        lastModified: lastIso ? new Date(lastIso) : new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      };
    });

    userPages = Array.from(nicknames).map((name) => ({
      url: `${SITE_URL}/user/${encodeURIComponent(name)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Sitemap 생성 중 리포트 가져오기 실패:', error);
  }

  // 구루 페이지 — 최신 13F 반영 시각 (매일 바뀌는 건 현재가뿐이라 공시 갱신일이 실제 변경일)
  const portfolios = loadGuruPortfolios();
  const guruPages: MetadataRoute.Sitemap = GURU_LIST.map((guru) => {
    const slug = guru.name_en.toLowerCase().replace(/\s+/g, '-');
    const updated = portfolios[slug]?.updated_at;
    return {
      url: `${SITE_URL}/portfolio/${slug}`,
      lastModified: updated ? new Date(updated) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    };
  });

  return [...staticPages, ...guruPages, ...reportPages, ...userPages];
}
