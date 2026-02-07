import type { Metadata, Viewport } from "next";
import { Oswald, Inter } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider, themeInitScript } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { BookmarkProvider } from "@/contexts/BookmarkContext";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import GoogleAdSense from "@/components/GoogleAdSense";
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
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
};

export const metadata: Metadata = {
  title: {
    default: 'GuruNote - 투자 리포트 공유 플랫폼',
    template: '%s | GuruNote',
  },
  description: '투자 아이디어를 공유하고 수익률을 추적하세요. 개인 투자자들의 투자 리포트 공유 커뮤니티입니다. 실시간 수익률 랭킹, 투자자 랭킹, 투자 분석 리포트를 확인하세요.',
  keywords: ['투자', '주식', '리포트', '수익률', '투자분석', '주식투자', '증권', '투자커뮤니티', 'GuruNote', '가치투자', '투자전략', '주식분석', '삼성전자', 'TSLA', 'NVDA', 'AAPL', '코스피', '나스닥'],
  authors: [{ name: 'GuruNote' }],
  creator: 'GuruNote',
  publisher: 'GuruNote',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://value-two-psi.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://value-two-psi.vercel.app',
    title: 'GuruNote - 투자 리포트 공유 플랫폼',
    description: '투자 아이디어를 공유하고 수익률을 추적하세요. 개인 투자자들의 투자 리포트 공유 커뮤니티입니다.',
    siteName: 'GuruNote',
    images: [
      {
        url: '/GuruNote.png',
        width: 1200,
        height: 630,
        alt: 'GuruNote',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GuruNote - 투자 리포트 공유 플랫폼',
    description: '투자 아이디어를 공유하고 수익률을 추적하세요.',
    images: ['/GuruNote.png'],
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
    icon: '/GuruNote.png',
    shortcut: '/GuruNote.png',
    apple: '/GuruNote.png',
  },
};

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

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
      "@id": `${process.env.NEXT_PUBLIC_SITE_URL || 'https://value-two-psi.vercel.app'}/#organization`,
      name: "GuruNote",
      alternateName: "부자FARM",
      url: process.env.NEXT_PUBLIC_SITE_URL || "https://value-two-psi.vercel.app",
      logo: {
        "@type": "ImageObject",
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://value-two-psi.vercel.app'}/GuruNote.png`,
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
      "@id": `${process.env.NEXT_PUBLIC_SITE_URL || 'https://value-two-psi.vercel.app'}/#website`,
      url: process.env.NEXT_PUBLIC_SITE_URL || "https://value-two-psi.vercel.app",
      name: "GuruNote",
      description: "투자 아이디어를 공유하고 수익률을 추적하세요. 개인 투자자들의 투자 리포트 공유 커뮤니티입니다.",
      publisher: {
        "@id": `${process.env.NEXT_PUBLIC_SITE_URL || 'https://value-two-psi.vercel.app'}/#organization`,
      },
      inLanguage: "ko-KR",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://value-two-psi.vercel.app'}/search?q={search_term_string}`,
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
    <html lang="ko" className={`${oswald.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Google Search Console 인증 */}
        <meta name="google-site-verification" content="AP5eR-Eum2IZ1OjbIlE-vI7mPeI0dmTdV-fxjja6RaU" />

        {/* 테마 초기화 (FOUC 방지) */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />

        {/* JSON-LD 구조화 데이터 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* DNS Prefetch & Preconnect */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        <GoogleAnalytics />
        <GoogleAdSense />
      </head>
      <body className="antialiased flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors font-body">
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
