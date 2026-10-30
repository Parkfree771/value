import { ImageResponse } from 'next/og';
import { loadGoogleFont, MASTHEAD_FONT } from '@/lib/ogFonts';

/**
 * 사이트 기본 OG 이미지 (메인·랭킹·구루·유저 등 리포트 외 페이지 공용)
 * - 사이트 제호와 같은 디자인: 흰 바탕 · 잉크 · 세리프 제호 · 이중 괘선
 * - 빌드 시 1회 렌더 → CDN 정적 서빙
 */
export const dynamic = 'force-static';

const TAGLINE = '개인 투자자가 쓰고, 시장이 채점한다';
const SUB = '작성 시점 가격이 박제되고, 이후 수익률이 매일 갱신되는 투자 리포트';

export async function GET() {
  const [mastheadFont, serifKr, sansKr] = await Promise.all([
    loadGoogleFont(MASTHEAD_FONT, { text: 'AntStreet' }),
    loadGoogleFont('Noto+Serif+KR:wght@700', { text: TAGLINE }),
    loadGoogleFont('Noto+Sans+KR:wght@500', { text: `${SUB}antstreet.kr·` }),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          color: '#111111',
          // 카톡/네이버 1.5:1 가운데 crop 대비 좌우 여백 확보
          padding: '0 132px',
        }}
      >
        <div style={{ display: 'flex', fontFamily: 'Masthead', fontSize: '170px', lineHeight: 1, letterSpacing: '-0.01em' }}>
          AntStreet
        </div>
        {/* 이중 괘선 */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: '28px', gap: '5px' }}>
          <div style={{ display: 'flex', height: '3px', background: '#111111' }} />
          <div style={{ display: 'flex', height: '1px', background: '#111111' }} />
        </div>
        <div style={{ display: 'flex', fontFamily: 'SerifKR', fontSize: '46px', marginTop: '34px' }}>{TAGLINE}</div>
        <div style={{ display: 'flex', fontFamily: 'SansKR', fontSize: '24px', color: '#555555', marginTop: '18px' }}>
          {SUB}
        </div>
        <div style={{ display: 'flex', fontFamily: 'SansKR', fontSize: '22px', color: '#d9560b', marginTop: '28px', letterSpacing: '0.04em' }}>
          antstreet.kr
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Masthead', data: mastheadFont, weight: 800, style: 'normal' },
        { name: 'SerifKR', data: serifKr, weight: 700, style: 'normal' },
        { name: 'SansKR', data: sansKr, weight: 500, style: 'normal' },
      ],
    },
  );
}
