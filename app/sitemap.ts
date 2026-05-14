import { MetadataRoute } from 'next';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { GURU_LIST } from './guru-tracker/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/ranking`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/guru-tracker`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/analysis`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE_URL}/analysis/us`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE_URL}/indicators`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/disclaimer`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  let reportPages: MetadataRoute.Sitemap = [];
  let userPages: MetadataRoute.Sitemap = [];

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: posts } = await supabase
      .from('posts')
      .select('id, created_at, updated_at, author:users!posts_author_id_fkey(nickname)');

    const nicknames = new Set<string>();
    reportPages = (posts ?? []).map((p) => {
      const updatedArr = (p.updated_at as string[] | null) ?? [];
      const lastIso =
        updatedArr.length > 0 ? updatedArr[updatedArr.length - 1] : p.created_at;
      const author = (p as { author?: { nickname?: string } | null }).author;
      if (author?.nickname) nicknames.add(author.nickname);

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

  const guruPages: MetadataRoute.Sitemap = GURU_LIST.map((guru) => ({
    url: `${SITE_URL}/portfolio/${guru.name_en.toLowerCase().replace(/\s+/g, '-')}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...guruPages, ...reportPages, ...userPages];
}
