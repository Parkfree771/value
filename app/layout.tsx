import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import dynamic from "next/dynamic";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider, themeInitScript } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { BookmarkProvider } from "@/contexts/BookmarkContext";
import { UserBadgesProvider } from "@/contexts/UserBadgesContext";
import GoogleAnalytics from "@/components/GoogleAnalytics";

// Footer는 viewport 밖에 있으므로 lazy load
const Footer = dynamic(() => import("@/components/Footer"), { ssr: true });
// CookieConsent도 lazy — 동의 끝나면 null 렌더라 초기 페인트에 필요 없음.
// 별도 청크로 빠져서 홈 초기 JS 미세하게 줄어듦.
const CookieConsent = dynamic(() => import("@/components/CookieConsent"), { ssr: true });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1714' },
  ],
};

export const metadata: Metadata = {
  title: {
    default: 'AntStreet - 개미 투자자들의 리포트 공유 플랫폼',
    // 페이지명을 앞에 두는 한국 검색결과 관행 (CTR 유리)
    template: '%s | AntStreet',
  },
  description: '개미 투자자들의 집단 지혜를 모으는 곳. 투자 아이디어를 공유하고 수익률을 추적하세요. 실시간 수익률 랭킹, 투자자 랭킹, 투자 분석 리포트를 확인하세요.',
  keywords: [
    'AntStreet', '앤트스트릿', '개미투자자', '투자 커뮤니티',
    '주식 리포트', '주식 분석', '투자 분석', '주식 SNS',
    '실시간 수익률', '수익률 인증', '수익률 검증',
    '한국 주식', '미국 주식', '일본 주식', '중국 주식', '홍콩 주식',
  ],
  authors: [{ name: 'AntStreet' }],
  creator: 'AntStreet',
  publisher: 'AntStreet',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr',
    title: 'AntStreet - 개미 투자자들의 리포트 공유 플랫폼',
    description: '개미 투자자들의 집단 지혜를 모으는 곳. 투자 아이디어를 공유하고 수익률을 추적하세요.',
    siteName: 'AntStreet',
    images: [
      {
        url: '/og-v2.jpg',
        width: 1731,
        height: 909,
        alt: 'AntStreet',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AntStreet - 개미 투자자들의 리포트 공유 플랫폼',
    description: '개미 투자자들의 집단 지혜를 모으는 곳. 투자 아이디어를 공유하고 수익률을 추적하세요.',
    images: ['/og-v2.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr',
  },
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Noto Sans KR 제거: ~150KB woff2 preload 비용이 LCP 지연의 주범이었다.
// 한글은 시스템 폰트(Apple SD Gothic Neo / Malgun Gothic / Pretendard 등)로 대체.
// 시각적 차이 거의 없고 첫 페인트는 명확히 빨라짐.

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// JSON-LD 구조화 데이터 (Organization + WebSite)
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr'}/#organization`,
      name: "AntStreet",
      alternateName: "부자FARM",
      url: process.env.NEXT_PUBLIC_SITE_URL || "https://antstreet.kr",
      logo: {
        "@type": "ImageObject",
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr'}/og-v2.jpg`,
        width: 1731,
        height: 909,
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "dbfh1498@gmail.com",
        contactType: "customer service",
        availableLanguage: "Korean",
      },
      address: {
        "@type": "PostalAddress",
        streetAddress: "킨텍스로 240",
        addressLocality: "고양시",
        addressRegion: "경기도",
        addressCountry: "KR",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr'}/#website`,
      url: process.env.NEXT_PUBLIC_SITE_URL || "https://antstreet.kr",
      name: "AntStreet",
      description: "개미 투자자들의 집단 지혜를 모으는 곳. 투자 아이디어를 공유하고 수익률을 추적하세요.",
      publisher: {
        "@id": `${process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr'}/#organization`,
      },
      inLanguage: "ko-KR",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr'}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Google Search Console 인증 */}
        <meta name="google-site-verification" content="thbsZW7iVjN1ZXSUejzzm9S_b-3uTv-Qv0S-tGiqGII" />

        {/* Naver Search Advisor 인증 */}
        <meta name="naver-site-verification" content="5a34f98d930b030eafe37723bc938f7e0c2909a4" />

        {/* 테마 초기화 (FOUC 방지) — beforeInteractive로 SSR/CSR 순서 고정 */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />

        {/* JSON-LD 구조화 데이터 */}
        <Script
          id="json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* RSS Feed */}
        <link rel="alternate" type="application/rss+xml" title="AntStreet RSS" href="/feed.xml" />

        {/* DNS Prefetch & Preconnect */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Supabase preconnect — HomeClient가 hydration 후 /api/feed/public 호출하고
            그 안에서 Postgres로 가는 connection 미리 열어둠 (~50-150ms 절약) */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />
          </>
        )}
        {/* NumFont(Barlow) 핵심 weight preload — globals.css의 @font-face 보다 빨리 fetch 시작.
            수익률 숫자 렌더가 살짝 빨라짐 (FOIT 짧아짐) */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="https://fonts.gstatic.com/s/barlow/v13/7cHpv4kjgoGqM7E_DMs5.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="https://fonts.gstatic.com/s/barlow/v13/7cHqv4kjgoGqM7E3t-4s51os.woff2"
          crossOrigin="anonymous"
        />

        <GoogleAnalytics />
      </head>
      <body className="antialiased flex flex-col min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors font-body">
        <ThemeProvider>
          <AuthProvider>
            <BookmarkProvider>
              <UserBadgesProvider>
                <Navbar />
                <main className="flex-1">
                  {children}
                </main>
                <Footer />
                <CookieConsent />
              </UserBadgesProvider>
            </BookmarkProvider>
          </AuthProvider>
        </ThemeProvider>

        {/* Google AdSense — production에서만 로드 (localhost는 AdSense가 403, 콘솔 노이즈 차단) */}
        {process.env.NODE_ENV === 'production' && (
          <Script
            id="adsense"
            async
            strategy="afterInteractive"
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6944494802169618"
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  );
}
