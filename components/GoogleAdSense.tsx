'use client';

import Script from 'next/script';

// Google AdSense 설정 - 환경변수에서 가져오기
const ADSENSE_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

export default function GoogleAdSense() {
  // AdSense ID가 설정되지 않았으면 컴포넌트를 렌더링하지 않음
  if (!ADSENSE_ID) {
    return null;
  }

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
  // AdSense ID가 설정되지 않았으면 컴포넌트를 렌더링하지 않음
  if (!ADSENSE_ID) {
    return null;
  }

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
