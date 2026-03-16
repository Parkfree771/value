import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // trailing slash 통일 → /page와 /page/ 중복 방지
  trailingSlash: false,

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/**',
      },
    ],
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  compress: true,

  poweredByHeader: false,

  reactStrictMode: true,

  experimental: {
    // 패키지 최적화 - tree shaking 강화
    optimizePackageImports: [
      'react-icons',
      'date-fns',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage',
      'recharts',
    ],
  },

  // 리다이렉트 설정
  async redirects() {
    return [
      // www → non-www 301 리다이렉트 (중복 도메인 방지)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.antstreet.kr' }],
        destination: 'https://antstreet.kr/:path*',
        permanent: true,
      },
      // 삭제된 페이지 리다이렉트 (Google 봇 404 방지)
      {
        source: '/market-call',
        destination: '/',
        permanent: true,
      },
      {
        source: '/market-call/:path*',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // 헤더 설정 - 보안 및 캐싱
  async headers() {
    // 보안 헤더
    const securityHeaders = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://apis.google.com https://*.firebaseapp.com https://*.googleapis.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://adservice.google.com https://www.google-analytics.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://cdn.jsdelivr.net",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
          "img-src 'self' data: blob: https: http:",
          "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com https://firebasestorage.googleapis.com https://api.upbit.com https://api.binance.com https://query1.finance.yahoo.com https://query2.finance.yahoo.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://adservice.google.com https://cdn.jsdelivr.net blob:",
          "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "worker-src 'self' blob:",
          "frame-ancestors 'none'",
        ].join('; '),
      },
    ];

    return [
      // video-editor: SharedArrayBuffer (ffmpeg.wasm) 활성화
      {
        source: '/video-editor.html',
        headers: [
          ...securityHeaders,
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
      // 모든 경로에 보안 헤더 적용
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // 정적 자산 캐싱
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=600',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
