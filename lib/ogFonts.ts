// OG 이미지(ImageResponse/satori)용 Google Fonts TTF 로더
// - 기본 UA 로 CSS API 를 부르면 TTF 를 준다 (satori 는 woff2 미지원)
// - text 를 주면 그 글자만 담은 작은 폰트 (한글 명조 제목·제호에 사용)
// - text 없이 여러 @font-face(언어별 조각)가 오면 라틴(U+0000-00FF) 조각을 고른다
// - Next fetch 캐시로 30일 보관

export async function loadGoogleFont(familyQuery: string, opts: { text?: string } = {}): Promise<ArrayBuffer> {
  // family 는 Google 형식 그대로("Noto+Serif+KR:wght@700") — URLSearchParams 를 쓰면 + 가 %2B 로 바뀌어 깨진다
  const text = opts.text ? `&text=${encodeURIComponent(Array.from(new Set(opts.text)).join(''))}` : '';
  const cssUrl = `https://fonts.googleapis.com/css2?family=${familyQuery}${text}&display=swap`;
  const css = await fetch(cssUrl, { next: { revalidate: 60 * 60 * 24 * 30 } }).then((r) => r.text());

  const faces = css.split('@font-face').slice(1);
  const pick = faces.find((f) => /U\+0000-00FF/i.test(f)) ?? faces[0] ?? '';
  const match = pick.match(/src:\s*url\((https:\/\/[^)]+)\)/);
  if (!match) throw new Error(`Font URL not found for ${familyQuery}`);
  return fetch(match[1], { next: { revalidate: 60 * 60 * 24 * 30 } }).then((r) => r.arrayBuffer());
}

/** 제호(AntStreet) — 사이트 .brand-title 과 같은 Noto Serif Display, 좁은 폭 · 800 */
export const MASTHEAD_FONT = 'Noto+Serif+Display:wdth,wght@70,800';
