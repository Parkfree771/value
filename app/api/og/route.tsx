import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/* ──── 가격 포맷 (통화별 심볼) ──── */
function currencySymbol(c: string): string {
  switch ((c || 'KRW').toUpperCase()) {
    case 'USD': return '$';
    case 'JPY': return '¥';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'CNY': return '¥';
    case 'HKD': return 'HK$';
    case 'KRW':
    default:    return '₩';
  }
}

function formatPrice(value: number, currency: string): string {
  if (!Number.isFinite(value)) return '—';
  const sym = currencySymbol(currency);
  // KRW는 정수, 외화는 소수점 2자리
  if ((currency || 'KRW').toUpperCase() === 'KRW') {
    return `${sym}${Math.round(value).toLocaleString('ko-KR')}`;
  }
  const digits = Math.abs(value) >= 100 ? 2 : 2;
  return `${sym}${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  // YYYY-MM-DD 또는 ISO 문자열
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Google Fonts에서 woff2 ArrayBuffer 로드
 * - CSS API는 User-Agent에 따라 다른 포맷 반환 → woff2 받기 위해 Mozilla UA
 * - Next.js fetch 캐시로 30일 영속화 (폰트는 거의 안 바뀜)
 */
async function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&display=swap`;
  // 기본 UA로 호출 → Google이 ttf 반환 (satori는 ttf/otf/woff 지원, woff2 미지원).
  const css = await fetch(cssUrl, {
    next: { revalidate: 60 * 60 * 24 * 30, tags: [`og-font-${family}-${weight}`] },
  }).then((r) => r.text());

  const match = css.match(/src:\s*url\((https:\/\/[^)]+)\)/);
  if (!match) throw new Error(`Font URL not found in CSS for ${family}:${weight}`);

  return fetch(match[1], {
    next: { revalidate: 60 * 60 * 24 * 30, tags: [`og-font-${family}-${weight}-bin`] },
  }).then((r) => r.arrayBuffer());
}

function exchangeLabel(ex: string): string {
  const e = (ex || '').toUpperCase();
  if (e === 'NAS') return 'NASDAQ';
  if (e === 'NYS') return 'NYSE';
  if (e === 'KRX') return 'KOSPI';
  if (e === 'CRYPTO') return 'CRYPTO';
  if (e === 'TSE') return 'TSE';
  if (e === 'HKS') return 'HKEX';
  return e || '';
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const title = (searchParams.get('title') || '').slice(0, 80);
  const stockName = searchParams.get('stockName') || '';
  const ticker = searchParams.get('ticker') || '';
  const exchange = exchangeLabel(searchParams.get('exchange') || '');
  const currency = searchParams.get('currency') || 'KRW';
  const initialPrice = parseFloat(searchParams.get('initialPrice') || '0');
  const currentPrice = parseFloat(searchParams.get('currentPrice') || '0');
  const returnRate = parseFloat(searchParams.get('returnRate') || '0');
  const author = (searchParams.get('author') || '익명').slice(0, 16);
  const date = formatDate(searchParams.get('date') || '');
  // positionType: 매수(long) 시 +녹/−빨, 숏(short) 시 그대로 (수익 관점은 동일)
  void searchParams.get('positionType');

  const isPositive = returnRate >= 0;
  const goodColor = '#059669'; // emerald-600
  const badColor = '#dc2626';  // red-600
  const rateColor = isPositive ? goodColor : badColor;
  const rateSign = isPositive ? '+' : '';
  const rateText = `${rateSign}${returnRate.toFixed(1)}%`;

  // 로고 이미지 — 동일 오리진에서 가져와 base64로 임베드 (satori가 절대 URL을 안정적으로
  // 처리하지 못하는 경우가 있어 인라인이 가장 robust).
  const origin = new URL(req.url).origin;
  let logoDataUrl = '';
  try {
    const buf = await fetch(`${origin}/og-antstreet-logo.png`, {
      next: { revalidate: 60 * 60 * 24 * 30, tags: ['og-logo'] },
    }).then((r) => r.arrayBuffer());
    logoDataUrl = `data:image/png;base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    // 폴백: 텍스트 로고 (이미지 로드 실패 시)
    logoDataUrl = '';
  }

  // 폰트 로드 — Google Fonts CSS API로 최신 woff2 URL 동적 조회
  // (정적 fonts.gstatic.com 직접 URL은 hash 변경 시 404)
  const [notoFont, barlowFont] = await Promise.all([
    loadGoogleFont('Noto+Sans+KR', 700),
    loadGoogleFont('Barlow', 700),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          // 네이버 블로그/카톡 등은 1200x630 OG 이미지를 ~1.5:1 비율로 가운데 crop하여 표시.
          // 좌우 132px(11%) 마진을 확보해 가장자리 콘텐츠(아바타, 가격, 푸터)가 잘리지 않도록 함.
          padding: '56px 132px',
          fontFamily: 'NotoSansKR',
          position: 'relative',
        }}
      >
        {/* ─── 헤더: AntStreet 로고 + 날짜 ─── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoDataUrl}
              alt="AntStreet"
              width={260}
              height={71}
              style={{ display: 'flex' }}
            />
          ) : (
            <div
              style={{
                fontSize: '40px',
                fontWeight: 700,
                color: '#1e293b',
                fontFamily: 'Barlow',
                letterSpacing: '-0.02em',
                display: 'flex',
              }}
            >
              AntStreet
            </div>
          )}
          {date && (
            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#94a3b8',
                fontFamily: 'Barlow',
                letterSpacing: '0.01em',
                display: 'flex',
              }}
            >
              {date}
            </div>
          )}
        </div>

        {/* 헤더 구분선 */}
        <div
          style={{
            height: '1px',
            background: '#e2e8f0',
            marginTop: '20px',
            marginBottom: '36px',
            display: 'flex',
          }}
        />

        {/* ─── 본문: 종목 → 제목 → 메트릭 ─── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'space-between',
          }}
        >
          {/* 종목 + 제목 */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* 종목 메타 칩 */}
            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#64748b',
                marginBottom: '20px',
                fontFamily: 'NotoSansKR',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ color: '#1e293b', display: 'flex' }}>{stockName}</span>
              <span style={{ color: '#cbd5e1', display: 'flex' }}>·</span>
              <span style={{ fontFamily: 'Barlow', letterSpacing: '0.02em', display: 'flex' }}>{ticker}</span>
              {exchange && (
                <>
                  <span style={{ color: '#cbd5e1', display: 'flex' }}>·</span>
                  <span style={{ fontFamily: 'Barlow', display: 'flex' }}>{exchange}</span>
                </>
              )}
            </div>

            {/* 제목 (메인) — 패딩 늘어난 만큼 폰트 약간 다운스케일 */}
            <div
              style={{
                fontSize: title.length > 30 ? '46px' : '54px',
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
                fontFamily: 'NotoSansKR',
                display: 'flex',
                maxWidth: '100%',
              }}
            >
              {title.length > 60 ? title.slice(0, 60) + '…' : title}
            </div>

            {/* brand color underline */}
            <div
              style={{
                width: '72px',
                height: '4px',
                background: '#3b50b5',
                borderRadius: '2px',
                marginTop: '24px',
                display: 'flex',
              }}
            />
          </div>

          {/* 하단 메트릭: (좌) 작성가→현재가  /  (우) 수익률 텍스트만 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px',
            }}
          >
            {/* 작성가 → 현재가 (좌측) */}
            {initialPrice > 0 && currentPrice > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '16px', color: '#94a3b8', fontFamily: 'NotoSansKR', fontWeight: 700, display: 'flex' }}>
                    작성가
                  </div>
                  <div style={{ fontSize: '32px', color: '#475569', fontFamily: 'Barlow', fontWeight: 700, display: 'flex' }}>
                    {formatPrice(initialPrice, currency)}
                  </div>
                </div>
                <div style={{ fontSize: '32px', color: '#cbd5e1', fontFamily: 'Barlow', display: 'flex' }}>→</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '16px', color: '#94a3b8', fontFamily: 'NotoSansKR', fontWeight: 700, display: 'flex' }}>
                    현재가
                  </div>
                  <div style={{ fontSize: '32px', color: '#0f172a', fontFamily: 'Barlow', fontWeight: 700, display: 'flex' }}>
                    {formatPrice(currentPrice, currency)}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex' }} />
            )}

            {/* 수익률 (우측) — 뱃지/화살표 제거, 숫자만 큰 폰트로 */}
            <div
              style={{
                fontSize: '64px',
                color: rateColor,
                fontFamily: 'Barlow',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                display: 'flex',
              }}
            >
              {rateText}
            </div>
          </div>
        </div>

        {/* ─── 푸터: (좌) 작성자  /  (우) 도메인 ─── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#475569',
              fontFamily: 'NotoSansKR',
              display: 'flex',
            }}
          >
            작성자: {author}
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#94a3b8',
              fontFamily: 'Barlow',
              letterSpacing: '0.02em',
              display: 'flex',
            }}
          >
            antstreet.kr
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'NotoSansKR', data: notoFont, weight: 700, style: 'normal' },
        { name: 'Barlow', data: barlowFont, weight: 700, style: 'normal' },
      ],
    },
  );
}
