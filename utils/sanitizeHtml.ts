/**
 * HTML을 안전하게 정화하되, 이미지와 기본적인 서식 태그는 허용합니다.
 * @param html 정화할 HTML 문자열
 * @returns 정화된 HTML 문자열
 */
export function sanitizeHtml(html: string): string {
  // 서버 사이드에서는 정화하지 않고 그대로 반환 (클라이언트에서 정화됨)
  if (typeof window === 'undefined') {
    return html;
  }

  // 클라이언트 사이드에서만 DOMPurify 사용
  const DOMPurify = require('isomorphic-dompurify');

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      // 텍스트 서식
      'p', 'br', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'mark',
      'small', 'sub', 'sup', 'code', 'pre', 'kbd', 'samp', 'var',

      // 목록
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',

      // 테이블
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
      'colgroup', 'col',

      // 링크 및 미디어
      'a', 'img', 'figure', 'figcaption',

      // 인용 및 구분선
      'blockquote', 'q', 'cite', 'hr',

      // 기타 시맨틱 태그
      'article', 'section', 'header', 'footer', 'nav', 'aside',
      'main', 'details', 'summary', 'time', 'address',
    ],
    ALLOWED_ATTR: [
      // 기본 속성
      'class', 'id', 'style',

      // 링크 속성
      'href', 'target', 'rel', 'title',

      // 이미지 속성
      'src', 'alt', 'width', 'height', 'loading',

      // 테이블 속성
      'colspan', 'rowspan', 'scope',

      // 시간 속성
      'datetime',

      // ARIA 접근성 속성
      'aria-label', 'aria-labelledby', 'aria-describedby',
      'role',
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
  });
}

/**
 * HTML 문자열에서 잠재적으로 위험한 요소를 제거합니다.
 * 더 엄격한 정화가 필요한 경우 사용합니다.
 */
export function sanitizeHtmlStrict(html: string): string {
  // 서버 사이드에서는 정화하지 않고 그대로 반환
  if (typeof window === 'undefined') {
    return html;
  }

  const DOMPurify = require('isomorphic-dompurify');

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}
