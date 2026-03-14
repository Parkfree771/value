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
  'th': ['colspan', 'rowspan', 'scope', 'colwidth', 'data-colwidth'],
  'td': ['colspan', 'rowspan', 'colwidth', 'data-colwidth'],
  'col': ['span', 'width'],
  'colgroup': ['span'],
  'table': ['data-colwidth'],
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
      'min-width': [/.*/],
      'max-width': [/.*/],
      'min-height': [/.*/],
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

// ── HTML 모드 전용 허용 태그 ──
// 기본 ALLOWED_TAGS + SVG + 약어 등 추가
// 차단 유지: script, iframe, object, embed, form, input, textarea, select, button,
//           video, audio, source, foreignObject, animate, animateTransform, set
const HTML_MODE_TAGS = [
  ...ALLOWED_TAGS,

  // 약어
  'abbr',

  // SVG — 차트, 아이콘, 다이어그램 용도
  // 보안 위험 태그 제외: foreignObject(HTML 삽입), animate*(클릭재킹), set
  'svg', 'g', 'path', 'circle', 'rect', 'ellipse', 'line',
  'polyline', 'polygon', 'text', 'tspan',
  'defs', 'use', 'symbol', 'clipPath', 'mask',
  'linearGradient', 'radialGradient', 'stop', 'pattern',
];

// ── HTML 모드 전용 허용 속성 ──
const HTML_MODE_ATTRIBUTES: Record<string, string[]> = {
  ...ALLOWED_ATTRIBUTES,

  'abbr': ['title'],

  // SVG 공통 속성
  'svg': ['viewBox', 'width', 'height', 'xmlns', 'fill', 'stroke', 'class', 'style', 'role', 'aria-label', 'aria-hidden'],
  'g': ['transform', 'fill', 'stroke', 'stroke-width', 'opacity', 'class', 'style', 'clip-path', 'mask'],
  'path': ['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'transform', 'class', 'style', 'fill-rule', 'clip-rule'],
  'circle': ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width', 'opacity', 'transform', 'class', 'style'],
  'ellipse': ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'stroke-width', 'opacity', 'transform', 'class', 'style'],
  'rect': ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke', 'stroke-width', 'opacity', 'transform', 'class', 'style'],
  'line': ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-dasharray', 'opacity', 'transform', 'class', 'style'],
  'polyline': ['points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'transform', 'class', 'style'],
  'polygon': ['points', 'fill', 'stroke', 'stroke-width', 'opacity', 'transform', 'class', 'style'],
  'text': ['x', 'y', 'dx', 'dy', 'text-anchor', 'dominant-baseline', 'font-size', 'font-family', 'font-weight', 'fill', 'stroke', 'opacity', 'transform', 'class', 'style'],
  'tspan': ['x', 'y', 'dx', 'dy', 'text-anchor', 'font-size', 'font-weight', 'fill', 'class', 'style'],
  'defs': [],
  'use': ['href', 'xlink:href', 'x', 'y', 'width', 'height', 'class', 'style'],
  'symbol': ['viewBox', 'id', 'class'],
  'clipPath': ['id'],
  'mask': ['id', 'x', 'y', 'width', 'height'],
  'linearGradient': ['id', 'x1', 'y1', 'x2', 'y2', 'gradientUnits', 'gradientTransform'],
  'radialGradient': ['id', 'cx', 'cy', 'r', 'fx', 'fy', 'gradientUnits', 'gradientTransform'],
  'stop': ['offset', 'stop-color', 'stop-opacity', 'style'],
  'pattern': ['id', 'x', 'y', 'width', 'height', 'patternUnits', 'patternTransform', 'viewBox'],
};

/**
 * HTML 모드 전용 살균 함수
 * 기본 sanitizeHtml보다 더 많은 태그를 허용하되, 보안 위협은 차단합니다.
 * - script, iframe, object, embed, form, input 등 위험 태그 차단
 * - SVG의 foreignObject, animate, set 차단
 * - on* 이벤트 핸들러 차단
 * - javascript: URL 차단
 * - position:fixed/sticky 차단 (페이지 오버레이 공격 방지)
 */
export function sanitizeHtmlMode(html: string): string {
  if (!html || typeof html !== 'string') return '';

  return sanitizeHtmlLib(html, {
    ...sanitizeOptions,
    allowedTags: HTML_MODE_TAGS,
    allowedAttributes: HTML_MODE_ATTRIBUTES,
    allowedStyles: {
      '*': {
        ...sanitizeOptions.allowedStyles?.['*'],
        // 포지셔닝 (fixed/sticky 제외)
        'position': [/^(static|relative|absolute)$/],
        // Flexbox
        'flex': [/.*/],
        'flex-direction': [/.*/],
        'flex-wrap': [/.*/],
        'flex-flow': [/.*/],
        'flex-grow': [/.*/],
        'flex-shrink': [/.*/],
        'flex-basis': [/.*/],
        'justify-content': [/.*/],
        'align-items': [/.*/],
        'align-self': [/.*/],
        'align-content': [/.*/],
        'place-items': [/.*/],
        'place-content': [/.*/],
        'gap': [/.*/],
        'row-gap': [/.*/],
        'column-gap': [/.*/],
        'order': [/.*/],
        // Grid
        'grid-template-columns': [/.*/],
        'grid-template-rows': [/.*/],
        'grid-template-areas': [/.*/],
        'grid-column': [/.*/],
        'grid-row': [/.*/],
        'grid-area': [/.*/],
        'grid-gap': [/.*/],
        'grid-auto-flow': [/.*/],
        'grid-auto-columns': [/.*/],
        'grid-auto-rows': [/.*/],
        // 오버플로우
        'overflow': [/^(visible|hidden|scroll|auto)$/],
        'overflow-x': [/^(visible|hidden|scroll|auto)$/],
        'overflow-y': [/^(visible|hidden|scroll|auto)$/],
        // 시각 효과
        'opacity': [/.*/],
        'transform': [/.*/],
        'transition': [/.*/],
        'box-shadow': [/.*/],
        'text-shadow': [/.*/],
        'filter': [/^(?!.*url\s*\().*$/],  // url() 제외한 filter만 허용 (blur, grayscale 등)
        'backdrop-filter': [/^(?!.*url\s*\().*$/],
        // 개별 보더
        'border-bottom': [/.*/],
        'border-top': [/.*/],
        'border-left': [/.*/],
        'border-right': [/.*/],
        'border-color': [/.*/],
        'border-style': [/.*/],
        'border-width': [/.*/],
        'border-collapse': [/.*/],
        'border-spacing': [/.*/],
        // 리스트
        'list-style': [/.*/],
        'list-style-type': [/.*/],
        // 텍스트
        'letter-spacing': [/.*/],
        'word-spacing': [/.*/],
        'white-space': [/.*/],
        'word-break': [/.*/],
        'overflow-wrap': [/.*/],
        'text-indent': [/.*/],
        'text-transform': [/.*/],
        'text-overflow': [/.*/],
        // 다단 레이아웃
        'column-count': [/.*/],
        'columns': [/.*/],
        // 기타
        'cursor': [/.*/],
        'outline': [/.*/],
        'float': [/.*/],
        'clear': [/.*/],
        'top': [/.*/],
        'right': [/.*/],
        'bottom': [/.*/],
        'left': [/.*/],
        'z-index': [/^\d+$/],
        'object-fit': [/.*/],
        'object-position': [/.*/],
        'aspect-ratio': [/.*/],
        'clip-path': [/^(?!.*url\s*\().*$/],
        'content': [/.*/],
        'counter-reset': [/.*/],
        'counter-increment': [/.*/],
        // 배경 이미지 (javascript: URL 제외)
        'background-image': [/^(?!.*javascript:).*$/],
        'background-size': [/.*/],
        'background-position': [/.*/],
        'background-repeat': [/.*/],
      },
    },
  });
}

/**
 * HTML 모드의 CSS를 살균합니다.
 * 위험한 CSS 패턴을 제거합니다.
 */
// @import 허용 도메인 (폰트 서비스만 허용)
const ALLOWED_IMPORT_DOMAINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net/gh',       // 오픈소스 폰트 CDN
  'fastly.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
];

export function sanitizeCssForHtmlMode(css: string): string {
  if (!css) return '';
  let sanitized = css;
  // @import: 허용된 폰트 도메인만 통과, 나머지 차단
  sanitized = sanitized.replace(/@import\b[^;]*;/gi, (match) => {
    const isAllowed = ALLOWED_IMPORT_DOMAINS.some(domain => match.includes(domain));
    return isAllowed ? match : '';
  });
  // position:fixed/sticky 차단
  sanitized = sanitized.replace(/position\s*:\s*(fixed|sticky)/gi, 'position: relative');
  // javascript: in url() 차단
  sanitized = sanitized.replace(/url\s*\(\s*["']?\s*javascript:/gi, 'url(');
  // expression() 차단 (IE)
  sanitized = sanitized.replace(/expression\s*\(/gi, '');
  // behavior: 차단 (IE)
  sanitized = sanitized.replace(/behavior\s*:/gi, '');
  // -moz-binding 차단
  sanitized = sanitized.replace(/-moz-binding\s*:/gi, '');
  return sanitized;
}

/**
 * CSS 셀렉터에 스코프 클래스를 붙여 다른 요소에 영향을 주지 않도록 합니다.
 * 예: "h1 { color: red }" → ".scope h1 { color: red }"
 */
export function scopeCssSelectors(css: string, scopeClass: string): string {
  if (!css) return '';

  // @media, @keyframes 등 at-rule은 그대로 유지하되, 내부 셀렉터만 스코핑
  return css.replace(/([^{}@]+)(\{[^}]*\})/g, (match, selectors, block) => {
    // at-rule 내부가 아닌 일반 셀렉터만 처리
    const trimmed = selectors.trim();
    if (trimmed.startsWith('@') || trimmed === '') return match;

    const scoped = trimmed
      .split(',')
      .map((s: string) => {
        const sel = s.trim();
        if (!sel) return sel;
        // body, html, :root 같은 건 스코프 클래스로 대체
        if (/^(body|html|:root)$/i.test(sel)) return `.${scopeClass}`;
        return `.${scopeClass} ${sel}`;
      })
      .join(', ');

    return `${scoped} ${block}`;
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
