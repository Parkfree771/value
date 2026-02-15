import { MetadataRoute } from 'next';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GURU_LIST } from './guru-tracker/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

/**
 * 동적 sitemap.xml 생성
 * 검색 엔진이 사이트의 모든 페이지를 찾을 수 있도록 도와줍니다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 정적 페이지들 (robots.txt에서 차단된 페이지는 제외)
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/ranking`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/guru-tracker`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Firestore에서 모든 리포트 가져오기 (동적 페이지)
  let reportPages: MetadataRoute.Sitemap = [];
  try {
    const postsSnapshot = await getDocs(collection(db, 'posts'));
    reportPages = postsSnapshot.docs.map((doc) => {
      const data = doc.data();
      let lastModified = new Date();

      // updatedAt 또는 createdAt 사용
      if (data.updatedAt?.toDate) {
        lastModified = data.updatedAt.toDate();
      } else if (data.createdAt?.toDate) {
        lastModified = data.createdAt.toDate();
      }

      return {
        url: `${SITE_URL}/reports/${doc.id}`,
        lastModified,
        changeFrequency: 'hourly' as const, // 수익률이 실시간으로 변하므로
        priority: 0.8,
      };
    });
  } catch (error) {
    console.error('Sitemap 생성 중 리포트 가져오기 실패:', error);
  }

  // 구루 포트폴리오 페이지
  const guruPages: MetadataRoute.Sitemap = GURU_LIST.map((guru) => ({
    url: `${SITE_URL}/portfolio/${guru.name_en.toLowerCase().replace(/\s+/g, '-')}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...guruPages, ...reportPages];
}
