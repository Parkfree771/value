/**
 * IndexNow - Bing/Naver/Yandex 등에 새 URL 즉시 색인 통보
 *
 * 키 파일은 public/{KEY}.txt 에 위치해야 하며, 파일 내용은 키 자체.
 * 환경변수 INDEXNOW_KEY 로 오버라이드 가능.
 *
 * 참고:
 * - IndexNow 공식: https://www.indexnow.org/
 * - 네이버 지원: https://searchadvisor.naver.com/guide/indexnow-overview
 */

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'b9f7e5a3c1d8b6f4e2a9c7d5b3f1e8a6';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr').replace(/\/$/, '');
const HOST = SITE_URL.replace(/^https?:\/\//, '');

const ENDPOINTS = [
  'https://api.indexnow.org/IndexNow', // 통합 (Bing, Yandex, Seznam)
  'https://www.bing.com/indexnow',
  'https://searchadvisor.naver.com/indexnow', // 네이버
  'https://yandex.com/indexnow',
];

/**
 * IndexNow 핑을 모든 엔드포인트로 비동기 전송.
 * Fire-and-forget 형태 - 결과를 await 하지 않아도 됨.
 */
export async function pingIndexNow(urls: string | string[]): Promise<void> {
  const urlList = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
  if (urlList.length === 0) return;

  const body = JSON.stringify({
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList,
  });

  await Promise.allSettled(
    ENDPOINTS.map((endpoint) =>
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body,
        // 색인 통보가 느려도 사이트 응답은 빠르게
        signal: AbortSignal.timeout(5000),
      })
        .then((res) => {
          // 200/202 = OK, 422 = 키 검증 실패, 429 = rate limit
          if (res.status >= 400) {
            console.warn(`[IndexNow] ${endpoint} → ${res.status}`);
          }
        })
        .catch((err) => {
          console.warn(`[IndexNow] ${endpoint} 실패:`, err?.message || err);
        }),
    ),
  );
}
