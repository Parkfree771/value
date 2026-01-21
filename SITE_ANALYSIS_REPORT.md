# 사이트 효율성 및 보안 분석 보고서

**분석 일자:** 2026-01-21
**프로젝트:** 워렌버핏 따라잡기 (warren-buffet-tracker)
**기술 스택:** Next.js 16 + Firebase + Tailwind CSS

---

## 1. 성능 최적화 현황

### 1.1 빌드 결과

| 항목 | 결과 | 평가 |
|------|------|------|
| 컴파일 시간 | 11.3초 | 우수 |
| 정적 페이지 생성 | 37개 / 6.7초 | 우수 |
| TypeScript 검사 | 통과 | 정상 |

### 1.2 페이지 렌더링 전략

| 페이지 | 타입 | Revalidate | 설명 |
|--------|------|------------|------|
| `/` (홈) | Static | 1분 | 서버 프리페칭 + ISR |
| `/ranking` | Static | - | 클라이언트 fetch |
| `/search` | Static | - | feed.json 기반 검색 |
| `/admin` | Static | - | feed.json + Firestore |
| `/reports/[id]` | Dynamic | 1시간 | feed.json + Firestore 조합 |
| `/api/*` | Dynamic | - | 서버 API |

### 1.3 번들 크기

| 항목 | 크기 | 평가 |
|------|------|------|
| 총 JS 청크 | ~1,541KB | 보통 |
| 정적 데이터 (JSON) | ~3,913KB | 양호 |

**최적화 적용 사항:**
- `optimizePackageImports`: react-icons, date-fns, firebase, @tiptap 등 tree-shaking
- `removeConsole`: 프로덕션 콘솔 로그 제거
- `compress`: gzip 압축 활성화

---

## 2. 데이터 아키텍처

### 2.1 데이터 흐름 구조

```
┌─────────────────────────────────────────────────────────────┐
│                        클라이언트                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    /api/feed/public                          │
│              (메모리 캐시 1분 + HTTP 캐시)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Firebase Storage (feed.json)                  │
│         - 게시글 목록, 수익률, 조회수, 좋아요                  │
│         - 주기적 가격 업데이트 (배치)                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Firestore (상세 조회)                     │
│         - content, stockData, images 등                     │
│         - 쓰기 작업 (생성/수정/삭제)                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 캐시 전략

| 레이어 | TTL | 전략 |
|--------|-----|------|
| 메모리 캐시 (jsonCache) | 1분 | stale-while-revalidate (2분) |
| Next.js fetch 캐시 | 1분 | revalidate |
| HTTP Cache-Control | 1분 | s-maxage=60, stale-while-revalidate=120 |
| 정적 자산 | 1년 | immutable |

### 2.3 Firebase 비용 최적화

**Before (최적화 전):**
- 홈 페이지: Firestore 직접 조회 (읽기 N회)
- 검색: Firestore 쿼리 (읽기 N회)
- 상세 페이지: Firestore 2회 + 주가 API 2회

**After (최적화 후):**
- 홈 페이지: feed.json 1회 (Storage 읽기)
- 검색: feed.json 캐시 (추가 비용 0)
- 상세 페이지: feed.json 캐시 + Firestore 1회

**예상 비용 절감:** Firestore 읽기 80%+ 감소

---

## 3. 보안 분석

### 3.1 인증/인가

| 항목 | 구현 상태 | 평가 |
|------|----------|------|
| 사용자 인증 | Firebase Auth (Google) | 양호 |
| 관리자 권한 | 이메일 화이트리스트 | 양호 |
| 세션 관리 | Firebase Auth Token | 양호 |

**관리자 권한 체크:**
```typescript
// lib/admin/adminCheck.ts
const ADMIN_EMAILS = ['dbfh1498@gmail.com'];
export function isAdmin(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
}
```

### 3.2 Firestore 보안 규칙

| 컬렉션 | 읽기 | 쓰기 | 수정 | 삭제 |
|--------|------|------|------|------|
| users | 모든 사용자 | 본인만 | 본인만 | 본인만 |
| posts | 모든 사용자 | 로그인 필수 | 작성자 + 특정 필드 | 작성자만 |
| comments | 모든 사용자 | 로그인 필수 | 작성자만 | 작성자만 |

**특이사항:**
- views, likes, returnRate 등은 누구나 업데이트 가능 (의도적)
- 삭제는 작성자만 가능 (관리자 삭제는 서버 API 통해)

### 3.3 API 보안

| API | 인증 | 권한 체크 | Rate Limit |
|-----|------|----------|------------|
| /api/admin/* | 필수 | 관리자 이메일 검증 | 없음 |
| /api/reports | 불필요 | - | pageSize 제한 (50) |
| /api/feed/public | 불필요 | - | 캐시로 보호 |

### 3.4 XSS 방어

```typescript
// isomorphic-dompurify 사용
// HTML 콘텐츠 sanitize 처리
```

### 3.5 npm 보안 감사

```
npm audit 결과:
- diff <4.0.4: DoS 취약점 (low) - 간접 의존성
- next 16.0.0-16.0.8: Server Actions 소스 노출 (high)

권장: npm audit fix 실행
```

**중요:** Next.js 취약점은 16.0.9로 업데이트 필요

---

## 4. Next.js 설정 분석

### 4.1 보안 헤더

```typescript
// next.config.ts
poweredByHeader: false,  // X-Powered-By 헤더 제거 ✓
reactStrictMode: true,   // React 엄격 모드 ✓
```

### 4.2 캐시 헤더 설정

| 리소스 | Cache-Control |
|--------|---------------|
| 이미지 (svg, jpg, png 등) | 1년, immutable |
| /_next/static/* | 1년, immutable |
| /data/* (JSON) | 5분, stale-while-revalidate 10분 |

### 4.3 이미지 최적화

```typescript
images: {
  formats: ['image/avif', 'image/webp'],  // 최신 포맷 지원
  minimumCacheTTL: 365일,
  remotePatterns: [Firebase Storage만 허용]
}
```

---

## 5. 성능 지표 (예상)

### 5.1 Core Web Vitals 예상

| 지표 | 예상 값 | 목표 |
|------|---------|------|
| LCP (Largest Contentful Paint) | 1.5-2초 | < 2.5초 |
| FID (First Input Delay) | < 100ms | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 | < 0.1 |

### 5.2 페이지별 로딩 속도 (예상)

| 페이지 | 초기 로드 | 후속 탐색 |
|--------|----------|----------|
| 홈 | 1-1.5초 | < 500ms |
| 검색 | 1-1.5초 | < 300ms |
| 게시글 상세 | 1.5-2초 | < 800ms |
| 관리자 | 1-1.5초 | < 500ms |

---

## 6. 권장 개선 사항

### 6.1 즉시 조치 필요 (높음)

1. **Next.js 보안 업데이트**
   ```bash
   npm update next
   # 또는 next@16.0.9 이상으로 업그레이드
   ```

2. **npm audit fix 실행**
   ```bash
   npm audit fix
   ```

### 6.2 권장 사항 (중간)

1. **Rate Limiting 추가**
   - 관리자 API에 rate limiting 적용
   - 로그인 시도 제한

2. **CSP (Content Security Policy) 헤더**
   ```typescript
   // next.config.ts headers()에 추가
   {
     key: 'Content-Security-Policy',
     value: "default-src 'self'; script-src 'self' 'unsafe-inline' ..."
   }
   ```

3. **CSRF 토큰**
   - 쓰기 작업에 CSRF 보호 추가

### 6.3 선택 사항 (낮음)

1. **번들 크기 최적화**
   - @tiptap 에디터 lazy loading
   - 코드 스플리팅 강화

2. **이미지 최적화**
   - next/image 컴포넌트 더 적극 활용

---

## 7. 결론

### 7.1 종합 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 성능 최적화 | 8/10 | 우수 |
| 데이터 아키텍처 | 9/10 | 매우 우수 |
| 보안 | 7/10 | 양호 (업데이트 필요) |
| 비용 효율성 | 9/10 | 매우 우수 |
| 유지보수성 | 8/10 | 우수 |

### 7.2 운영 준비 상태

**현재 상태: 운영 가능 (조건부)**

- feed.json 기반 아키텍처로 Firebase 비용 효율적
- 캐시 전략이 잘 구현되어 빠른 응답 속도
- 보안 규칙이 적절히 설정됨
- **단, Next.js 보안 업데이트 후 배포 권장**

### 7.3 스케일링 예상

| 동시 사용자 | 예상 동작 |
|------------|----------|
| ~100명 | 문제 없음 |
| ~1,000명 | 캐시 효과로 안정적 |
| ~10,000명 | feed.json 캐시 + CDN으로 대응 가능 |

---

**작성자:** Claude AI
**버전:** 1.0
