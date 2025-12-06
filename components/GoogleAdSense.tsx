'use client';

import Script from 'next/script';

// Google AdSense 설정
// 실제 배포 시 환경변수로 관리하세요: process.env.NEXT_PUBLIC_ADSENSE_ID
const ADSENSE_ID = 'ca-pub-XXXXXXXXXXXXXXXX'; // Google AdSense Publisher ID로 교체

export default function GoogleAdSense() {
  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}

// 개별 광고 유닛 컴포넌트
interface AdUnitProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  responsive?: boolean;
  style?: React.CSSProperties;
}

export function AdUnit({ slot, format = 'auto', responsive = true, style }: AdUnitProps) {
  return (
    <div style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
      <Script
        id={`adsense-${slot}`}
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(adsbygoogle = window.adsbygoogle || []).push({});`,
        }}
      />
    </div>
  );
}
