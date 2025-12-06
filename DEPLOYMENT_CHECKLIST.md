# 배포 전 체크리스트

## 1. 법적 문서 ✅
- [x] 이용약관 페이지 (`/terms`)
- [x] 개인정보처리방침 페이지 (`/privacy`)
- [x] Footer에 법적 문서 링크 추가
- [x] 투자 면책 조항 추가

## 2. SEO 최적화 ✅
- [x] Meta 태그 설정 (layout.tsx)
- [x] Open Graph 태그 설정
- [x] Twitter Card 설정
- [x] 키워드 최적화
- [x] sitemap.xml 생성
- [x] robots.txt 생성

## 3. Google 서비스 준비 ✅
- [x] Google Analytics 스크립트 준비
- [x] Google AdSense 스크립트 준비
- [ ] **실제 Google Analytics ID 발급 및 적용**
- [ ] **실제 Google AdSense ID 발급 및 적용**

## 4. 배포 전 필수 수정 사항

### 🔴 반드시 변경해야 할 항목들:

#### A. 도메인 설정
- [ ] `app/layout.tsx`의 `metadataBase` URL 변경
  ```typescript
  metadataBase: new URL('https://your-actual-domain.com'),
  ```

- [ ] `app/sitemap.ts`의 `baseUrl` 변경
  ```typescript
  const baseUrl = 'https://your-actual-domain.com';
  ```

- [ ] `app/robots.ts`의 `baseUrl` 변경
  ```typescript
  const baseUrl = 'https://your-actual-domain.com';
  ```

#### B. Google Analytics 설정
1. Google Analytics 계정 생성: https://analytics.google.com
2. 새 속성 만들기
3. 측정 ID (G-XXXXXXXXXX) 받기
4. `components/GoogleAnalytics.tsx`에서 ID 교체:
   ```typescript
   const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // 실제 ID로 교체
   ```

#### C. Google AdSense 설정
1. Google AdSense 신청: https://www.google.com/adsense
2. 승인 대기 (보통 1-2주 소요)
3. 승인 후 Publisher ID (ca-pub-XXXXXXXXXXXXXXXX) 받기
4. `components/GoogleAdSense.tsx`에서 ID 교체:
   ```typescript
   const ADSENSE_ID = 'ca-pub-XXXXXXXXXXXXXXXX'; // 실제 ID로 교체
   ```

#### D. 개인정보 보호책임자 정보
- [ ] `app/privacy/page.tsx`에서 담당자 정보 입력:
  ```tsx
  <li>이름: [실제 담당자명]</li>
  <li>이메일: privacy@your-domain.com</li>
  <li>전화번호: [실제 연락처]</li>
  ```

#### E. 연락처 정보
- [ ] `components/Footer.tsx`의 이메일 주소 변경:
  ```tsx
  이메일: contact@your-domain.com
  ```

#### F. Google Search Console 인증
1. Google Search Console 등록: https://search.google.com/search-console
2. 사이트 소유권 확인
3. `app/layout.tsx`의 `verification.google` 코드 입력:
   ```typescript
   verification: {
     google: 'your-verification-code',
   },
   ```

## 5. 환경변수 설정 (권장)

`.env.local` 파일 생성:
```env
NEXT_PUBLIC_SITE_URL=https://your-actual-domain.com
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_ADSENSE_ID=ca-pub-XXXXXXXXXXXXXXXX
```

그리고 코드에서 사용:
```typescript
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXXXXXX';
```

## 6. 성능 최적화

- [x] 이미지 최적화 (Next.js Image 컴포넌트 사용)
- [x] 폰트 최적화
- [ ] Lighthouse 점수 확인 (90점 이상 목표)
- [ ] Core Web Vitals 확인

## 7. 보안 설정

- [ ] HTTPS 설정 확인
- [ ] CSP (Content Security Policy) 설정
- [ ] Rate Limiting 설정
- [ ] CORS 설정

## 8. 테스트

- [ ] 모든 페이지 로딩 확인
- [ ] 다크모드 정상 작동 확인
- [ ] 모바일 반응형 확인
- [ ] 리포트 작성/조회 기능 테스트
- [ ] 크로스 브라우저 테스트 (Chrome, Safari, Firefox, Edge)

## 9. 애드센스 승인을 위한 권장사항

### 콘텐츠 요구사항:
- [ ] 최소 20개 이상의 고품질 게시글
- [ ] 각 게시글 최소 300단어 이상
- [ ] 정기적인 업데이트 (주 2-3회)
- [ ] 독창적인 콘텐츠 (복사/붙여넣기 금지)

### 사이트 요구사항:
- [ ] 프라이버시 정책 페이지 ✅
- [ ] 이용약관 페이지 ✅
- [ ] 연락처 정보 ✅
- [ ] About/소개 페이지
- [ ] 명확한 네비게이션 ✅
- [ ] 최소 3-6개월 운영 이력

### 금지사항:
- [ ] 불법 콘텐츠
- [ ] 성인 콘텐츠
- [ ] 폭력적 콘텐츠
- [ ] 저작권 침해 콘텐츠
- [ ] 클릭 유도 문구

## 10. 배포 플랫폼 선택

### Vercel (권장)
```bash
npm install -g vercel
vercel login
vercel
```

### 기타 옵션:
- Netlify
- AWS Amplify
- Google Cloud Run
- Railway

## 11. 배포 후 확인사항

- [ ] 모든 페이지 정상 작동
- [ ] Google Analytics 데이터 수집 확인
- [ ] Google Search Console 색인 상태 확인
- [ ] sitemap.xml 접근 가능 (`/sitemap.xml`)
- [ ] robots.txt 접근 가능 (`/robots.txt`)
- [ ] SSL 인증서 정상 작동
- [ ] 404 페이지 확인

## 12. 마케팅 및 홍보

- [ ] 소셜 미디어 계정 생성
- [ ] 커뮤니티 홍보
- [ ] SEO 블로그 작성
- [ ] 백링크 구축

---

## 📝 참고 링크

- Google Analytics: https://analytics.google.com
- Google AdSense: https://www.google.com/adsense
- Google Search Console: https://search.google.com/search-console
- Next.js 배포 가이드: https://nextjs.org/docs/deployment
- Vercel 배포: https://vercel.com

---

## ⚠️ 주의사항

1. **절대 공개 리포지토리에 API 키를 커밋하지 마세요!**
2. 환경변수는 `.env.local`에 저장하고 `.gitignore`에 추가하세요.
3. 배포 전 반드시 로컬에서 프로덕션 빌드 테스트하세요:
   ```bash
   npm run build
   npm run start
   ```
4. AdSense 승인은 시간이 걸릴 수 있습니다. 조급해하지 마세요.
5. 법적 문서는 변호사의 검토를 받는 것이 좋습니다.
