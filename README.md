# 워렌버핏 따라잡기 - 투자 리포트 플랫폼

개인 투자자들이 직접 매수·매도 리포트를 작성하고, 시간이 지나면서 해당 리포트의 성과(수익률)를 자동으로 추적해 주는 주식 커뮤니티 & 리포트 플랫폼.

## 주요 기능

### 구현된 UI

- **메인 페이지 (피드)**: 전체 리포트 피드, 필터링 기능
- **랭킹 페이지**: 수익률 기준 상위 리포트 및 투자자 랭킹
- **리포트 작성**: 종목 검색, 투자 의견 작성, 목표가 설정
- **리포트 상세**: 수익률 추적, 종목 프로필, 댓글 기능
- **마이페이지**: 포트폴리오 성과, 내 리포트 관리
- **로그인/회원가입**: 이메일 인증, 소셜 로그인 UI

### 예정된 기능 (백엔드 연동 필요)

- 주식 API 연동 (실시간 주가, 기업 정보)
- 수익률 자동 계산 및 업데이트
- 사용자 인증 및 권한 관리
- 댓글, 좋아요, 북마크 기능
- 팔로우/팔로잉 시스템

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Netlify

## 시작하기

### 환경 변수 설정

1. `.env.example` 파일을 복사하여 `.env` 파일을 생성합니다:

```bash
cp .env.example .env
```

2. `.env` 파일을 열어 실제 값을 입력합니다:

```env
# Firebase 설정
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# 사이트 URL
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Google Analytics (선택사항)
NEXT_PUBLIC_GA_MEASUREMENT_ID=your-ga-id

# Google AdSense (선택사항)
# NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxxxxx
```

**중요**: `.env` 파일은 Git에 커밋되지 않습니다. 민감한 정보가 포함되어 있으므로 절대 공개 저장소에 업로드하지 마세요.

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 열어 확인하세요.

### 빌드

```bash
npm run build
```

### 프로덕션 실행

```bash
npm start
```

## 프로젝트 구조

```
value/
├── app/                      # Next.js App Router 페이지
│   ├── page.tsx             # 메인 페이지 (피드)
│   ├── ranking/             # 랭킹 페이지
│   ├── reports/             # 리포트 관련 페이지
│   │   ├── new/            # 리포트 작성
│   │   └── [id]/           # 리포트 상세
│   ├── mypage/              # 마이페이지
│   ├── login/               # 로그인
│   └── signup/              # 회원가입
├── components/               # 재사용 가능한 컴포넌트
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── ReportCard.tsx
│   └── ...
└── public/                   # 정적 파일

```

## 네트리파이 배포

1. GitHub에 코드 푸시
2. Netlify에서 저장소 연결
3. 빌드 설정은 `netlify.toml`에 자동 구성됨
4. 배포 완료!

## 다음 단계

1. **백엔드 API 개발**
   - 사용자 인증 (JWT, OAuth)
   - 리포트 CRUD API
   - 주식 데이터 API 연동

2. **주가 추적 시스템**
   - 주식 API 통합 (국내/해외)
   - 배치 작업으로 수익률 자동 업데이트
   - 종목 프로필 자동 저장

3. **커뮤니티 기능**
   - 댓글 시스템
   - 좋아요/북마크
   - 팔로우/팔로잉

4. **고급 기능**
   - 검색 및 추천 시스템
   - 알림 시스템
   - 리포트 공유 기능 (SNS)

## 라이선스

MIT License
