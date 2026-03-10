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
  // 정적 페이지들 (noindex 페이지는 제외: login, signup, mypage, write, onboarding, admin)
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
      url: `${SITE_URL}/indicators`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/disclaimer`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Firestore에서 모든 리포트 가져오기 (동적 페이지)
  let reportPages: MetadataRoute.Sitemap = [];
  let userPages: MetadataRoute.Sitemap = [];
  try {
    const postsSnapshot = await getDocs(collection(db, 'posts'));
    const authorNames = new Set<string>();

    reportPages = postsSnapshot.docs.map((doc) => {
      const data = doc.data();
      let lastModified = new Date();

      // updatedAt 또는 createdAt 사용
      if (data.updatedAt?.toDate) {
        lastModified = data.updatedAt.toDate();
      } else if (data.createdAt?.toDate) {
        lastModified = data.createdAt.toDate();
      }

      // 작성자 수집 (유저 프로필 페이지용)
      if (data.authorName) {
        authorNames.add(data.authorName);
      }

      return {
        url: `${SITE_URL}/reports/${doc.id}`,
        lastModified,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      };
    });

    // 유저 프로필 페이지
    userPages = Array.from(authorNames).map((name) => ({
      url: `${SITE_URL}/user/${encodeURIComponent(name)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
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

  return [...staticPages, ...guruPages, ...reportPages, ...userPages];
}
