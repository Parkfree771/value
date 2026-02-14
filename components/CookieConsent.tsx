'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CONSENT_KEY = 'cookie-consent';

export function getCookieConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CONSENT_KEY) === 'accepted';
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
    window.location.reload();
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[var(--pixel-bg-card)] border-t-[3px] border-[var(--pixel-border-muted)] shadow-pixel">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 font-pixel text-xs">
          <p>
            본 사이트는 서비스 개선 및 맞춤형 광고를 위해 쿠키를 사용합니다.
            자세한 내용은{' '}
            <Link href="/privacy" className="text-[var(--pixel-accent)] hover:underline">
              개인정보처리방침
            </Link>
            을 확인하세요.
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={handleDecline}
            className="btn-secondary font-pixel !py-2 !px-4 !text-xs"
          >
            거부
          </button>
          <button
            onClick={handleAccept}
            className="btn-primary font-pixel !py-2 !px-4 !text-xs"
          >
            동의
          </button>
        </div>
      </div>
    </div>
  );
}
