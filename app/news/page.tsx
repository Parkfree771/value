import { Metadata } from 'next';
import NewsClient from './NewsClient';

export const metadata: Metadata = {
  title: '글로벌 뉴스 브리핑',
  description: '해외 주요 매체의 뉴스를 카테고리별로 선별하여 한국어로 제공합니다. 경제, 금융, 테크, 글로벌 뉴스를 한눈에 확인하세요.',
  openGraph: {
    title: 'AntStreet - 글로벌 뉴스 브리핑',
    description: '해외 주요 매체의 뉴스를 카테고리별로 선별하여 한국어로 제공합니다.',
  },
};

const NEWS_URL = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/news.json?alt=media`;

async function getNewsData() {
  try {
    const res = await fetch(NEWS_URL, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function NewsPage() {
  const data = await getNewsData();
  return <NewsClient initialData={data} />;
}
