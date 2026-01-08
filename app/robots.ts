import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://warrennvalue.netlify.app';

/**
 * robots.txt 생성
 * 검색 엔진 크롤러에게 크롤링 규칙을 알려줍니다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/', '/mypage/', '/write/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/', '/mypage/', '/write/'],
        crawlDelay: 0, // 구글은 크롤 딜레이 무시하지만 명시
      },
      {
        userAgent: 'Yeti', // 네이버 검색봇
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/', '/mypage/', '/write/'],
        crawlDelay: 1,
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/', '/mypage/', '/write/'],
        crawlDelay: 1,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
