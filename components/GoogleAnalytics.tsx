'use client';

import Script from 'next/script';

// Google Analytics 설정
// 실제 배포 시 환경변수로 관리하세요: process.env.NEXT_PUBLIC_GA_ID
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Google Analytics Measurement ID로 교체

export default function GoogleAnalytics() {
  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
