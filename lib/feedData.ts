import { cache } from 'react';
import type { FeedData, FeedPost } from '@/types/feed';

const FEED_URL = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/feed.json?alt=media`;

export const getFeedData = cache(async (): Promise<FeedData | null> => {
  try {
    const response = await fetch(FEED_URL, { next: { revalidate: 60 } });
    if (!response.ok) return null;
    return (await response.json()) as FeedData;
  } catch (error) {
    console.error('[feedData] feed.json 가져오기 실패:', error);
    return null;
  }
});

export async function getFeedPost(id: string): Promise<FeedPost | null> {
  const data = await getFeedData();
  return data?.posts.find((p) => p.id === id) || null;
}

export interface RelatedSets {
  sameTicker: FeedPost[];
  sameAuthor: FeedPost[];
  sameTheme: FeedPost[];
  popular: FeedPost[];
}

export async function getRelatedReports(
  currentId: string,
  ticker: string,
  author: string,
  themes: string[] | undefined,
  limit = 5,
): Promise<RelatedSets> {
  const data = await getFeedData();
  if (!data) {
    return { sameTicker: [], sameAuthor: [], sameTheme: [], popular: [] };
  }

  const others = data.posts.filter((p) => p.id !== currentId);
  const tickerUpper = (ticker || '').toUpperCase();

  const sameTicker = tickerUpper
    ? others.filter((p) => (p.ticker || '').toUpperCase() === tickerUpper).slice(0, limit)
    : [];

  const sameAuthor = author
    ? others
        .filter((p) => p.author === author && (p.ticker || '').toUpperCase() !== tickerUpper)
        .slice(0, limit)
    : [];

  const themeSet = new Set(themes || []);
  const sameTheme = themeSet.size > 0
    ? others
        .filter(
          (p) =>
            (p.ticker || '').toUpperCase() !== tickerUpper &&
            p.author !== author &&
            (p.themes || []).some((t) => themeSet.has(t)),
        )
        .slice(0, limit)
    : [];

  const excludeIds = new Set<string>([
    ...sameTicker.map((p) => p.id),
    ...sameAuthor.map((p) => p.id),
    ...sameTheme.map((p) => p.id),
  ]);

  const popular = [...others]
    .filter((p) => !excludeIds.has(p.id))
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, limit);

  return { sameTicker, sameAuthor, sameTheme, popular };
}
