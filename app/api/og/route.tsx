import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const title = searchParams.get('title') || '';
  const stockName = searchParams.get('stockName') || '';
  const ticker = searchParams.get('ticker') || '';
  const returnRate = searchParams.get('returnRate') || '0';
  const opinion = searchParams.get('opinion') || 'buy';

  const rate = parseFloat(returnRate);
  const isPositive = rate >= 0;
  // 사이트 컬러: 매수(빨강) = 양수, 매도(파랑) = 음수
  const rateColor = isPositive ? '#ef4444' : '#3b82f6';
  const rateText = `${isPositive ? '+' : ''}${rate.toFixed(2)}%`;

  // 폰트 로드 (Noto Sans KR Bold + Barlow Bold)
  const [notoFont, barlowFont] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.woff').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/barlow/v13/7cHqv4kjgoGqM7E3t-4s51os.woff2').then(r => r.arrayBuffer()),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          padding: '48px 60px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 배경 그라데이션 장식 */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,80,181,0.15) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            left: '-80px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* AntStreet 로고 - 좌상단 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
          {/* 3D 그림자 레이어 */}
          <div
            style={{
              position: 'absolute',
              top: '48px',
              left: '60px',
              fontSize: '36px',
              fontFamily: 'Barlow',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#2d3e8f',
              textShadow: '1px 1px 0px #1e2d6b, 2px 2px 0px #1e2d6b, 3px 3px 0px rgba(30,45,107,0.5)',
              display: 'flex',
            }}
          >
            AntStreet
          </div>
          {/* 그라데이션 레이어 */}
          <div
            style={{
              fontSize: '36px',
              fontFamily: 'Barlow',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(110deg, #3b50b5 0%, #5a6fc7 25%, #F97316 50%, #5a6fc7 75%, #3b50b5 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              display: 'flex',
              position: 'relative',
              zIndex: 1,
            }}
          >
            AntStreet
          </div>
        </div>

        {/* 메인 콘텐츠: 기업명+종목코드 (왼쪽) | 수익률 (오른쪽) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flex: 1,
            marginBottom: '20px',
          }}
        >
          {/* 왼쪽: 기업명 + 종목코드 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={{
                fontSize: '52px',
                fontFamily: 'NotoSansKR',
                fontWeight: 700,
                color: '#f1f5f9',
                lineHeight: 1.2,
                display: 'flex',
              }}
            >
              {stockName}
            </div>
            <div
              style={{
                fontSize: '28px',
                fontFamily: 'Barlow',
                fontWeight: 700,
                color: '#64748b',
                letterSpacing: '0.02em',
                display: 'flex',
              }}
            >
              {ticker}
            </div>
          </div>

          {/* 오른쪽: 수익률 (2줄 높이만큼 큰 폰트) */}
          <div
            style={{
              fontSize: '96px',
              fontFamily: 'Barlow',
              fontWeight: 700,
              color: rateColor,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {rateText}
          </div>
        </div>

        {/* 하단: 게시글 제목 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderTop: '1px solid rgba(100,116,139,0.3)',
            paddingTop: '24px',
          }}
        >
          <div
            style={{
              fontSize: '28px',
              fontFamily: 'NotoSansKR',
              fontWeight: 700,
              color: '#94a3b8',
              lineHeight: 1.4,
              display: 'flex',
              maxWidth: '100%',
            }}
          >
            {title.length > 50 ? title.slice(0, 50) + '...' : title}
          </div>
        </div>

        {/* 하단 우측 브랜드 */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '60px',
            fontSize: '16px',
            fontFamily: 'Barlow',
            fontWeight: 700,
            color: '#475569',
            display: 'flex',
          }}
        >
          antstreet.kr
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'NotoSansKR',
          data: notoFont,
          weight: 700,
          style: 'normal',
        },
        {
          name: 'Barlow',
          data: barlowFont,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  );
}
