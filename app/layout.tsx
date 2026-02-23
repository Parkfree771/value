import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider, themeInitScript } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { BookmarkProvider } from "@/contexts/BookmarkContext";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import CookieConsent from "@/components/CookieConsent";

// Footer는 viewport 밖에 있으므로 lazy load
const Footer = dynamic(() => import("@/components/Footer"), { ssr: true });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#050505' },
  ],
};

export const metadata: Metadata = {
  title: {
    default: 'AntStreet - 개미 투자자들의 리포트 공유 플랫폼',
    template: '%s | AntStreet',
  },
  description: '개미 투자자들의 집단 지혜를 모으는 곳. 투자 아이디어를 공유하고 수익률을 추적하세요. 실시간 수익률 랭킹, 투자자 랭킹, 투자 분석 리포트를 확인하세요.',
  keywords: ['투자', '주식', '리포트', '수익률', '투자분석', '주식투자', '증권', '투자커뮤니티', 'AntStreet', '앤트스트릿', '개미투자자', '가치투자', '투자전략', '주식분석', '삼성전자', 'TSLA', 'NVDA', 'AAPL', '코스피', '나스닥'],
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
        url: '/logo-background.png',
        width: 1200,
        height: 630,
        alt: 'AntStreet',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AntStreet - 개미 투자자들의 리포트 공유 플랫폼',
    description: '개미 투자자들의 집단 지혜를 모으는 곳. 투자 아이디어를 공유하고 수익률을 추적하세요.',
    images: ['/logo-background.png'],
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
    icon: '/logo-background.png',
    shortcut: '/logo-background.png',
    apple: '/logo-background.png',
  },
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
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
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr'}/logo-background.png`,
        width: 512,
        height: 512,
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
      sameAs: [],
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
    <html lang="ko" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Google Search Console 인증 */}
        <meta name="google-site-verification" content="thbsZW7iVjN1ZXSUejzzm9S_b-3uTv-Qv0S-tGiqGII" />

        {/* Naver Search Advisor 인증 */}
        <meta name="naver-site-verification" content="5a34f98d930b030eafe37723bc938f7e0c2909a4" />

        {/* 테마 초기화 (FOUC 방지) */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />

        {/* JSON-LD 구조화 데이터 */}
        <script
          type="application/ld+json"
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

        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6944494802169618"
          crossOrigin="anonymous"
        />

        <GoogleAnalytics />
      </head>
      <body className="antialiased flex flex-col min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors font-body">
        <ThemeProvider>
          <AuthProvider>
            <BookmarkProvider>
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
              <CookieConsent />
            </BookmarkProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
