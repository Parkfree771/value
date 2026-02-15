import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

/**
 * robots.txt 생성
 * 검색 엔진 크롤러에게 크롤링 규칙을 알려줍니다.
 */
export default function robots(): MetadataRoute.Robots {
  // 크롤링 제외 경로
  const disallowPaths = [
    '/api/',
    '/_next/',
    '/admin/',
    '/mypage/',
    '/write/',
    '/onboarding/',
    '/login/',
    '/signup/',
    // 리포트 편집 페이지 (동적 경로)
    '/reports/*/edit',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: disallowPaths,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: disallowPaths,
        crawlDelay: 0, // 구글은 크롤 딜레이 무시하지만 명시
      },
      {
        userAgent: 'Yeti', // 네이버 검색봇
        allow: '/',
        disallow: disallowPaths,
        crawlDelay: 1,
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: disallowPaths,
        crawlDelay: 1,
      },
      {
        userAgent: 'Daumoa', // 다음 검색봇
        allow: '/',
        disallow: disallowPaths,
        crawlDelay: 1,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
