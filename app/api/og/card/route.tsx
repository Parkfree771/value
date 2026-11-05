import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { loadGoogleFont, MASTHEAD_FONT } from '@/lib/ogFonts';

/**
 * 리포트 외 페이지 공용 OG 카드 (구루 포트폴리오 · 투자자 프로필 · 랭킹)
 * - 사이트 제호 디자인 그대로: 흰 지면 · 잉크 괘선 · 세리프 제목
 * - 하단 지표 줄(m)이 핵심 — 수익률은 크게, 한국식 색(상승 빨강 / 하락 파랑)
 *
 * 쿼리
 *   k  키커 (작은 오렌지 라벨)       예) 13F 포트폴리오 · 2026년 2분기
 *   t  제목 (명조)                   예) 워렌 버핏
 *   s  부제 (회색 한 줄)              예) Berkshire Hathaway · 41종목 · $258.7B
 *   m  지표 "라벨~값" (최대 3개, 반복) 예) m=공시 후 수익률~+4.2%&m=승률~62%
 *   v  캐시 무효화용 버전
 */
export const runtime = 'edge';

const UP = '#b8322a'; // 사이트 --color-up
const DOWN = '#2b5ba8'; // 사이트 --color-down

function valueColor(value: string): string {
  if (/^\+/.test(value) && !/^\+0(\.0+)?%$/.test(value)) return UP;
  if (/^[-−]/.test(value)) return DOWN;
  return '#111111';
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const kicker = (q.get('k') || '').slice(0, 40);
  const title = (q.get('t') || 'AntStreet').slice(0, 40);
  const sub = (q.get('s') || '').slice(0, 70);
  const metrics = q
    .getAll('m')
    .slice(0, 3)
    .map((m) => {
      const [label, value] = m.split('~');
      return { label: (label || '').slice(0, 14), value: (value || '').slice(0, 12) };
    })
    .filter((m) => m.label && m.value);

  const sansText = `${kicker}${sub}${metrics.map((m) => m.label).join('')}antstreet.kr·`;
  const numText = `${metrics.map((m) => m.value).join('')}0123456789+-−.%$`;
  const [mastheadFont, serifKr, sansKr, numFont] = await Promise.all([
    loadGoogleFont(MASTHEAD_FONT, { text: 'AntStreet' }),
    loadGoogleFont('Noto+Serif+KR:wght@700', { text: `${title}…` }),
    loadGoogleFont('Noto+Sans+KR:wght@700', { text: sansText }),
    // 지표 값엔 한글 단위(종목·개)도 올 수 있어 한글 subset 도 같이 쓴다
    loadGoogleFont('Noto+Sans+KR:wght@700', { text: numText }),
  ]);

  const titleSize = title.length > 14 ? 64 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          color: '#111111',
          // 카톡/네이버 1.5:1 가운데 crop 대비 좌우 여백
          padding: '56px 132px',
          fontFamily: 'SansKR',
        }}
      >
        {/* 제호 + 이중 괘선 */}
        <div style={{ display: 'flex', fontFamily: 'Masthead', fontSize: '46px', lineHeight: 1 }}>AntStreet</div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '18px', gap: '4px' }}>
          <div style={{ display: 'flex', height: '3px', background: '#111111' }} />
          <div style={{ display: 'flex', height: '1px', background: '#111111' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          {kicker && (
            <div style={{ display: 'flex', fontSize: '24px', color: '#d9560b', letterSpacing: '0.02em' }}>{kicker}</div>
          )}
          <div
            style={{
              display: 'flex',
              fontFamily: 'SerifKR',
              fontSize: `${titleSize}px`,
              lineHeight: 1.15,
              marginTop: '10px',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>
          {sub && (
            <div style={{ display: 'flex', fontSize: '24px', color: '#555555', marginTop: '14px' }}>{sub}</div>
          )}
        </div>

        {metrics.length > 0 && (
          <div style={{ display: 'flex', borderTop: '2px solid #111111', paddingTop: '20px' }}>
            {metrics.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  paddingLeft: i === 0 ? '0' : '28px',
                  borderLeft: i === 0 ? 'none' : '1px solid #dedede',
                }}
              >
                <div style={{ display: 'flex', fontSize: '22px', color: '#555555' }}>{m.label}</div>
                <div
                  style={{
                    display: 'flex',
                    fontFamily: 'Num',
                    // 첫 지표(대개 수익률)를 가장 크게
                    fontSize: i === 0 ? '72px' : '52px',
                    lineHeight: 1.1,
                    marginTop: '6px',
                    color: valueColor(m.value),
                    letterSpacing: '-0.02em',
                  }}
                >
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Masthead', data: mastheadFont, weight: 800, style: 'normal' },
        { name: 'SerifKR', data: serifKr, weight: 700, style: 'normal' },
        { name: 'SansKR', data: sansKr, weight: 700, style: 'normal' },
        { name: 'Num', data: numFont, weight: 700, style: 'normal' },
      ],
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
