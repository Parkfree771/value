import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { shortStockName } from '@/utils/reportDisplay';
import { loadGoogleFont as loadSubsetFont, MASTHEAD_FONT } from '@/lib/ogFonts';

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
  const rawDate = searchParams.get('date') || '';
  const date = formatDate(rawDate);
  // 투자 근거 한 줄 (본문 앞부분) — "왜 샀는지"가 이 사이트의 핵심이라 미리보기에도 노출
  const excerpt = (searchParams.get('excerpt') || '').slice(0, 80);
  // 현재가 기준일 — 카톡 등은 미리보기를 오래 캐시하므로 "언제 기준 가격인지" 명시
  const rawAsOf = searchParams.get('asOf') || '';
  const asOf = formatDate(rawAsOf);
  const heldDays =
    rawDate && rawAsOf
      ? Math.max(0, Math.floor((new Date(rawAsOf).getTime() - new Date(rawDate).getTime()) / 86400000))
      : null;
  // positionType: 매수(long) 시 +녹/−빨, 숏(short) 시 그대로 (수익 관점은 동일)
  void searchParams.get('positionType');

  const isPositive = returnRate >= 0;
  // 한국식 — 상승 빨강 / 하락 파랑 (사이트 getReturnColorClass 와 동일)
  const goodColor = '#b8322a'; // 사이트 --color-up
  const badColor = '#2b5ba8';  // 사이트 --color-down
  const rateColor = isPositive ? goodColor : badColor;
  const rateSign = isPositive ? '+' : '';
  const rateText = `${rateSign}${returnRate.toFixed(1)}%`;


  // 미국 ETF/ADR 원문명은 "PROSHARES TRUST II ULTA BLOMBERG CRUD OIL(POST REV SPLT)" 처럼 길고 시끄러움
  const cleanName = shortStockName(stockName, ticker);
  const displayStockName = cleanName.length > 32 ? `${cleanName.slice(0, 30).trim()}…` : cleanName;
  // 본문 폭 936px 기준: 52px 제목은 ~18자, 44px 은 ~21자에서 줄바꿈.
  // 제목이 두 줄이면 근거는 한 줄(~36자)로 줄여 하단 수익률 영역을 밀어내지 않게 한다.
  const titleFontSize = title.length > 18 ? 44 : 52;
  const titleTwoLines = title.length > 21;
  const excerptMax = titleTwoLines ? 36 : 70;
  const shownExcerpt = excerpt.length > excerptMax ? `${excerpt.slice(0, excerptMax).trim()}…` : excerpt;

  // 폰트 로드 — Google Fonts CSS API로 최신 woff2 URL 동적 조회
  // (정적 fonts.gstatic.com 직접 URL은 hash 변경 시 404)
  const [notoFont, barlowFont, mastheadFont, serifTitleFont] = await Promise.all([
    loadGoogleFont('Noto+Sans+KR', 700),
    loadGoogleFont('Barlow', 700),
    loadSubsetFont(MASTHEAD_FONT, { text: 'AntStreet' }),
    // 제목은 사이트처럼 명조 — 제목 글자만 담은 작은 폰트
    loadSubsetFont('Noto+Serif+KR:wght@700', { text: `${title}…` }),
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
          <div
            style={{
              fontSize: '46px',
              color: '#111111',
              fontFamily: 'Masthead',
              letterSpacing: '-0.01em',
              lineHeight: 1,
              display: 'flex',
            }}
          >
            AntStreet
          </div>
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
            marginBottom: '28px',
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
              <span style={{ color: '#1e293b', display: 'flex' }}>{displayStockName}</span>
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
                fontSize: `${titleFontSize}px`,
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
                fontFamily: 'SerifTitle',
                display: 'flex',
                maxWidth: '100%',
              }}
            >
              {title.length > 48 ? title.slice(0, 48) + '…' : title}
            </div>

            {/* 투자 근거 한 줄 */}
            {excerpt && (
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#64748b',
                  lineHeight: 1.4,
                  marginTop: '18px',
                  paddingLeft: '18px',
                  borderLeft: '4px solid #111111',
                  display: 'flex',
                }}
              >
                {shownExcerpt}
              </div>
            )}
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
                    {asOf ? `${asOf} 기준` : '현재가'}
                  </div>
                  <div style={{ fontSize: '32px', color: '#0f172a', fontFamily: 'Barlow', fontWeight: 700, display: 'flex' }}>
                    {formatPrice(currentPrice, currency)}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex' }} />
            )}

            {/* 수익률 (우측) — 보유 기간을 함께 보여줘 "시간이 증명했다"는 맥락을 준다 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              {heldDays !== null && (
                <div style={{ fontSize: '18px', color: '#94a3b8', fontFamily: 'NotoSansKR', fontWeight: 700, display: 'flex' }}>
                  작성 후 {heldDays.toLocaleString('ko-KR')}일
                </div>
              )}
              <div
                style={{
                  fontSize: '64px',
                  color: rateColor,
                  fontFamily: 'Barlow',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                  display: 'flex',
                }}
              >
                {rateText}
              </div>
            </div>
          </div>
        </div>

        {/* ─── 푸터: (좌) 작성자  /  (우) 도메인 ─── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '28px',
            paddingTop: '16px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'NotoSansKR', data: notoFont, weight: 700, style: 'normal' },
        { name: 'Barlow', data: barlowFont, weight: 700, style: 'normal' },
        { name: 'Masthead', data: mastheadFont, weight: 800, style: 'normal' },
        { name: 'SerifTitle', data: serifTitleFont, weight: 700, style: 'normal' },
      ],
    },
  );
}
