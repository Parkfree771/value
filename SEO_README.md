# SEO 기능 구현 완료

## 구현된 기능

### 1. 동적 메타데이터 생성 (generateMetadata)
- **파일**: `app/reports/[id]/page.tsx`
- **기능**: 각 리포트 페이지마다 고유한 메타 태그 자동 생성
- **포함 내용**:
  - 리포트 제목 중심의 동적 타이틀: `삼성전자 반도체 업황 회복 기대 (작성 당시 대비 +24.5%) - 워렌버핏 따라잡기`
  - 리포트 내용 미리보기가 포함된 설명문
  - Open Graph 메타 태그 (소셜 미디어 공유용)
  - Twitter Card 메타 태그
  - 검색 엔진 최적화를 위한 키워드

### 2. 실시간 주가 및 수익률 계산
- **파일**: `lib/stockPrice.ts`
- **기능**:
  - Yahoo Finance API를 사용하여 실시간 주가 조회
  - 한국 주식 (코스피/코스닥) 지원
  - 롱/숏 포지션 모두 지원
  - 수익률 자동 계산 및 업데이트

### 3. Sitemap.xml 자동 생성
- **파일**: `app/sitemap.ts`
- **기능**:
  - 정적 페이지 + Firestore의 모든 리포트 자동 포함
  - 검색 엔진이 모든 페이지를 찾을 수 있도록 지원
  - 우선순위 및 변경 빈도 설정

### 4. Robots.txt 설정
- **파일**: `app/robots.ts`
- **기능**:
  - 구글, 네이버(Yeti), Bing 크롤러 설정
  - 크롤링 허용/차단 규칙 정의
  - Sitemap 위치 자동 연결

### 5. JSON-LD 구조화된 데이터
- **파일**: `lib/metadata.ts`
- **기능**:
  - Schema.org Article 형식의 구조화된 데이터
  - 검색 결과에 Rich Snippet 표시 가능
  - 투자 정보 (수익률, 초기 가격, 현재 가격 등) 포함

## 사용 방법

### 1. 환경 변수 설정
\`\`\`bash
# .env.local.example을 .env.local로 복사
cp .env.local.example .env.local

# .env.local 파일을 열어서 실제 값 입력
# 특히 중요한 설정:
# - NEXT_PUBLIC_SITE_URL: https://warrennvalue.netlify.app
# - Firebase 설정값들
\`\`\`

### 2. 빌드 및 배포
\`\`\`bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 실행
npm start
\`\`\`

### 3. SEO 확인 방법

#### 메타 태그 확인
브라우저에서 페이지 소스 보기 (Ctrl+U 또는 Cmd+U):
\`\`\`html
<title>삼성전자 반도체 업황 회복 기대 (작성 당시 대비 +24.5%) - 워렌버핏 따라잡기</title>
<meta name="description" content="삼성전자(005930) 투자 리포트. 삼성전자의 반도체 부문이 회복세를 보이고 있습니다. 특히 HBM 시장에서의 입지 강화와 파운드리 사업의 턴어라운드가 기대됩니다... | 3개월 전 작성, 작성 당시 대비 +24.5%" />
\`\`\`

#### Sitemap 확인
\`\`\`
http://localhost:3000/sitemap.xml
\`\`\`

#### Robots.txt 확인
\`\`\`
http://localhost:3000/robots.txt
\`\`\`

### 4. 검색 엔진 등록

#### Google Search Console
1. https://search.google.com/search-console 접속
2. 속성 추가 → 도메인 입력
3. Sitemap 제출: `https://warrennvalue.netlify.app/sitemap.xml`

#### 네이버 웹마스터 도구
1. https://searchadvisor.naver.com 접속
2. 사이트 등록
3. 사이트맵 제출: `https://warrennvalue.netlify.app/sitemap.xml`

## 파일 구조

\`\`\`
app/
├── reports/
│   └── [id]/
│       └── page.tsx                  # 서버 컴포넌트 + generateMetadata
├── sitemap.ts                        # Sitemap 자동 생성
└── robots.ts                         # Robots.txt 설정

lib/
├── stockPrice.ts                     # 주가 조회 및 수익률 계산
└── metadata.ts                       # 메타데이터 생성 유틸리티

components/
└── ReportDetailClient.tsx            # 클라이언트 컴포넌트
\`\`\`

## 주요 기능 설명

### 동적 타이틀 생성
서버에서 리포트 데이터를 가져올 때마다 실시간 주가를 조회하여 수익률을 계산합니다:
\`\`\`typescript
// app/reports/[id]/page.tsx
export async function generateMetadata({ params }) {
  const report = await getReportData(params.id);

  // 실시간 주가로 수익률 재계산
  const updatedData = await updateReportReturnRate(
    report.ticker,
    report.initialPrice,
    report.positionType
  );

  return generateReportMetadata(report, updatedData.returnRate);
}
\`\`\`

### ISR (Incremental Static Regeneration)
리포트 페이지는 1시간마다 자동으로 재생성됩니다:
\`\`\`typescript
// app/reports/[id]/page.tsx
export const revalidate = 3600; // 1시간
\`\`\`

### 색상 시스템
- **상승 (플러스 수익률)**: 빨간색 (`#DC2626`)
- **하락 (마이너스 수익률)**: 파란색 (`#2563EB`)
- **변동 없음**: 회색 (`#6B7280`)

## 성능 최적화

1. **서버 컴포넌트 활용**: 메타데이터 생성 로직은 서버에서만 실행
2. **Edge Runtime**: OG 이미지는 Edge에서 빠르게 생성
3. **ISR**: 1시간마다 페이지 재생성으로 최신 주가 반영
4. **캐싱**: 동일한 리포트는 1시간 동안 캐시 사용

## 문제 해결

### Yahoo Finance API 에러
- 한국 주식의 경우 `.KS` (코스피) 또는 `.KQ` (코스닥) 접미사 필요
- 예: 삼성전자 = `005930.KS`

### Firestore 권한 에러
Firebase 콘솔에서 Firestore Rules 확인:
\`\`\`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if true;  // 모든 사람이 읽을 수 있도록
      allow write: if request.auth != null;
    }
  }
}
\`\`\`

## 향후 개선 사항

- [ ] Google Search Console API 연동으로 자동 색인 요청
- [ ] 리치 스니펫 (별점, 가격 등) 추가
- [ ] AMP (Accelerated Mobile Pages) 지원
- [ ] 다국어 SEO (영어, 일본어 등)
- [ ] 커스텀 OG 이미지 추가 (선택사항)
