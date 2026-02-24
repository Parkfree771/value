/**
 * HTML 살균 유틸리티
 *
 * 보안: 서버/클라이언트 모두에서 XSS 공격을 방지하기 위해 HTML을 살균합니다.
 * - sanitize-html 패키지 사용 (서버/클라이언트 공용)
 */

import sanitizeHtmlLib from 'sanitize-html';

// 허용할 HTML 태그 목록
const ALLOWED_TAGS = [
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
];

// 허용할 속성 목록
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  '*': ['class', 'id', 'style'],
  'a': ['href', 'target', 'rel', 'title'],
  'img': ['src', 'alt', 'width', 'height', 'loading'],
  'th': ['colspan', 'rowspan', 'scope'],
  'td': ['colspan', 'rowspan'],
  'time': ['datetime'],
  // ARIA 접근성 속성
  'div': ['role', 'aria-label', 'aria-labelledby', 'aria-describedby'],
  'span': ['role', 'aria-label', 'aria-labelledby', 'aria-describedby'],
  'button': ['role', 'aria-label', 'aria-labelledby', 'aria-describedby'],
};

// 허용할 URL 스킴
const ALLOWED_URL_SCHEMES = ['http', 'https', 'mailto', 'tel'];

// 금지할 CSS 속성 (XSS 방지)
const FORBIDDEN_CSS_PROPERTIES = [
  'behavior',
  'expression',
  '-moz-binding',
  'javascript',
];

/**
 * CSS 스타일에서 위험한 속성 제거
 */
function sanitizeStyle(style: string): string {
  if (!style) return '';

  // 위험한 CSS 속성 제거
  let sanitized = style;
  for (const prop of FORBIDDEN_CSS_PROPERTIES) {
    const regex = new RegExp(`${prop}\\s*:`, 'gi');
    sanitized = sanitized.replace(regex, '');
  }

  // url() 내부의 javascript: 제거
  sanitized = sanitized.replace(/url\s*\(\s*["']?\s*javascript:/gi, 'url(');

  return sanitized;
}

/**
 * sanitize-html 옵션 (서버/클라이언트 공용)
 */
const sanitizeOptions: sanitizeHtmlLib.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  allowedSchemes: ALLOWED_URL_SCHEMES,
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },
  transformTags: {
    // 외부 링크에 rel="noopener noreferrer" 추가
    'a': (tagName, attribs) => {
      const href = attribs.href || '';
      if (href.startsWith('http') && !href.includes(process.env.NEXT_PUBLIC_SITE_URL || '')) {
        return {
          tagName,
          attribs: {
            ...attribs,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        };
      }
      return { tagName, attribs };
    },
  },
  // 인라인 스타일 허용하되 위험한 속성 제거
  allowedStyles: {
    '*': {
      'color': [/.*/],
      'background-color': [/.*/],
      'background': [/^(?!.*url\s*\(\s*["']?\s*javascript:).*/],
      'font-family': [/.*/],
      'font-size': [/.*/],
      'font-weight': [/.*/],
      'font-style': [/.*/],
      'text-align': [/.*/],
      'text-decoration': [/.*/],
      'margin': [/.*/],
      'margin-top': [/.*/],
      'margin-bottom': [/.*/],
      'margin-left': [/.*/],
      'margin-right': [/.*/],
      'padding': [/.*/],
      'padding-top': [/.*/],
      'padding-bottom': [/.*/],
      'padding-left': [/.*/],
      'padding-right': [/.*/],
      'border': [/.*/],
      'border-radius': [/.*/],
      'width': [/.*/],
      'height': [/.*/],
      'max-width': [/.*/],
      'max-height': [/.*/],
      'display': [/^(block|inline|inline-block|flex|grid|none)$/],
      'vertical-align': [/.*/],
      'line-height': [/.*/],
    },
  },
  // 이벤트 핸들러 완전 차단
  exclusiveFilter: (frame) => {
    // on* 속성 제거 (onclick, onerror 등)
    if (frame.attribs) {
      for (const attr of Object.keys(frame.attribs)) {
        if (attr.toLowerCase().startsWith('on')) {
          delete frame.attribs[attr];
        }
      }
    }
    return false;
  },
};

/**
 * HTML에서 <style> 태그를 추출합니다.
 * @param html HTML 문자열
 * @returns { css: string, html: string } - 추출된 CSS와 CSS가 제거된 HTML
 */
export function extractStyleTag(html: string): { css: string; html: string } {
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const cssMatches: string[] = [];

  // 모든 <style> 태그의 내용 추출
  let match;
  while ((match = styleRegex.exec(html)) !== null) {
    cssMatches.push(match[1]);
  }

  // HTML에서 <style> 태그 제거
  const cleanedHtml = html.replace(styleRegex, '');

  return {
    css: cssMatches.join('\n'),
    html: cleanedHtml
  };
}

/**
 * HTML을 안전하게 정화하되, 이미지와 기본적인 서식 태그는 허용합니다.
 * 서버와 클라이언트 모두에서 안전하게 동작합니다.
 *
 * @param html 정화할 HTML 문자열
 * @returns 정화된 HTML 문자열
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return sanitizeHtmlLib(html, sanitizeOptions);
}

/**
 * HTML 문자열에서 잠재적으로 위험한 요소를 제거합니다.
 * 더 엄격한 정화가 필요한 경우 사용합니다.
 * (댓글, 사용자 입력 등에 사용)
 */
export function sanitizeHtmlStrict(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // 서버/클라이언트 모두 sanitize-html 사용 (일관성)
  return sanitizeHtmlLib(html, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li'],
    allowedAttributes: {
      'a': ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https'],
    transformTags: {
      'a': (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    },
  });
}

/**
 * 텍스트에서 모든 HTML 태그를 제거합니다.
 * 순수 텍스트만 필요할 때 사용합니다.
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return sanitizeHtmlLib(html, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}
