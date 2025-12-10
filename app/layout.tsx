import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import GoogleAdSense from "@/components/GoogleAdSense";

export const metadata: Metadata = {
  title: {
    default: '워렌버핏 따라잡기 - 투자 리포트 공유 플랫폼',
    template: '%s | 워렌버핏 따라잡기',
  },
  description: '투자 아이디어를 공유하고 수익률을 추적하세요. 개인 투자자들의 투자 리포트 공유 커뮤니티입니다. 실시간 수익률 랭킹, 투자자 랭킹, 투자 분석 리포트를 확인하세요.',
  keywords: ['투자', '주식', '리포트', '수익률', '투자분석', '주식투자', '증권', '투자커뮤니티', '워렌버핏', '가치투자', '투자전략', '주식분석', '삼성전자', 'TSLA', 'NVDA', 'AAPL', '코스피', '나스닥'],
  authors: [{ name: '워렌버핏 따라잡기' }],
  creator: '워렌버핏 따라잡기',
  publisher: '워렌버핏 따라잡기',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://warren-tracker.com'), // 실제 도메인으로 변경 필요
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://warren-tracker.com',
    title: '워렌버핏 따라잡기 - 투자 리포트 공유 플랫폼',
    description: '투자 아이디어를 공유하고 수익률을 추적하세요. 개인 투자자들의 투자 리포트 공유 커뮤니티입니다.',
    siteName: '워렌버핏 따라잡기',
    images: [
      {
        url: '/warren.png',
        width: 1200,
        height: 630,
        alt: '워렌버핏 따라잡기',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '워렌버핏 따라잡기 - 투자 리포트 공유 플랫폼',
    description: '투자 아이디어를 공유하고 수익률을 추적하세요.',
    images: ['/warren.png'],
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
    icon: '/warren.png',
    shortcut: '/warren.png',
    apple: '/warren.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <GoogleAnalytics />
        <GoogleAdSense />
      </head>
      <body className="antialiased flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
