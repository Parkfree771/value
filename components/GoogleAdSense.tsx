'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { getCookieConsent } from './CookieConsent';

const ADSENSE_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

export default function GoogleAdSense() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    setConsented(getCookieConsent());
  }, []);

  if (!ADSENSE_ID || !consented) {
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
