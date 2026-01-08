# 유지보수 가이드 (Maintenance Guide)

## 📚 목차
- [디자인 수정 가이드](#디자인-수정-가이드)
- [컴포넌트 구조](#컴포넌트-구조)
- [파일 구조](#파일-구조)
- [자주 묻는 질문](#자주-묻는-질문)

---

## 🎨 디자인 수정 가이드

### 1. 색상 변경하기

#### 전체 사이트 색상 변경
**파일:** `app/globals.css` (12-30줄)

```css
:root {
  /* 브랜드 컬러 변경 */
  --brand-primary: #3b82f6;  /* 메인 색상 */
  --brand-secondary: #8b5cf6; /* 서브 색상 */

  /* 투자 의견 색상 변경 */
  --color-buy: #ef4444;   /* 매수 빨강 */
  --color-sell: #3b82f6;  /* 매도 파랑 */
  --color-hold: #6b7280;  /* 보유 회색 */
}
```

**적용 범위:** 전체 사이트

---

#### 특정 버튼 색상만 변경
**파일:** `components/Button.tsx` (18-23줄)

```tsx
const variantStyles = {
  primary: 'bg-gradient-to-r from-electric-blue-600 to-electric-blue-700...',
  secondary: 'bg-gray-700 text-gray-200...',
  // 여기서 각 버튼 variant의 색상 수정
};
```

**적용 범위:** 해당 variant를 사용하는 모든 버튼

---

### 2. 폰트 변경하기

**파일:** `app/globals.css` (80-84줄)

```css
body {
  /*
    폰트 변경하려면 여기 수정:
    예) font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
  */
  font-family: Arial, Helvetica, sans-serif;
}
```

**적용 범위:** 전체 사이트

**참고:**
- 한글 폰트 추천: Pretendard, Noto Sans KR, 나눔고딕
- 웹폰트 사용 시 `app/layout.tsx`에서 import 필요

---

### 3. 카드 디자인 변경하기

#### 방법 1: 컴포넌트에서 직접 수정 (권장)
**파일:** `components/Card.tsx` (30-44줄)

```tsx
const variantStyles = {
  base: 'bg-white dark:bg-gray-900...',      // 기본 카드
  interactive: '...hover:border-blue-500',   // 클릭 가능 카드
  glass: 'bg-white/80...backdrop-blur',      // 유리 효과
  elevated: '...shadow-lg',                   // 그림자 강조
};
```

**사용 예시:**
```tsx
// 페이지에서 variant만 바꿔서 디자인 변경
<Card variant="glass">내용</Card>
<Card variant="elevated">내용</Card>
```

**적용 범위:** 해당 variant를 사용하는 모든 카드

---

#### 방법 2: globals.css 공통 클래스 수정
**파일:** `app/globals.css` (161-167줄)

```css
.card-base {
  @apply bg-white dark:bg-gray-900 rounded-xl...;
  /* Tailwind 클래스로 스타일 정의 */
}

.card-interactive {
  @apply card-base;
  @apply hover:border-electric-blue-500...;
}
```

**적용 범위:** `.card-base` 클래스를 사용하는 모든 요소

---

### 4. 배지(Badge) 디자인 변경하기

**파일:** `components/Badge.tsx` (18-29줄)

```tsx
const variantStyles = {
  buy: 'bg-red-100 dark:bg-red-900/30...',    // 매수 배지
  sell: 'bg-blue-100 dark:bg-blue-900/30...',  // 매도 배지
  hold: 'bg-gray-100 dark:bg-gray-700...',     // 보유 배지
  success: 'bg-green-100...',                  // 성공 배지
  // 여기서 각 배지 색상 수정
};
```

**사용 예시:**
```tsx
<Badge variant="buy">매수</Badge>
<OpinionBadge opinion="buy" />  // 투자 의견 전용
```

**적용 범위:** 해당 variant를 사용하는 모든 배지

---

### 5. 버튼 디자인 변경하기

**파일:** `components/Button.tsx`

#### 버튼 색상 변경 (18-23줄)
```tsx
const variantStyles = {
  primary: 'bg-gradient-to-r from-electric-blue-600...',
  secondary: 'bg-gray-700...',
  outline: 'border border-electric-blue-500...',
  danger: 'bg-gradient-to-r from-red-600...',
};
```

#### 버튼 크기 변경 (25-29줄)
```tsx
const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs h-8',
  md: 'px-5 py-2 text-sm h-10',
  lg: 'px-8 py-3 text-base h-12',
};
```

**사용 예시:**
```tsx
<Button variant="primary" size="lg">큰 버튼</Button>
<Button variant="danger" size="sm">작은 위험 버튼</Button>
```

---

### 6. 수익률 색상 변경하기

**파일:** `app/globals.css` (186-195줄)

```css
.return-positive {
  @apply text-red-600 dark:text-red-500;  /* 수익 빨강 */
}

.return-negative {
  @apply text-blue-600 dark:text-blue-500;  /* 손실 파랑 */
}

.return-neutral {
  @apply text-gray-600 dark:text-gray-400;  /* 변동 없음 */
}
```

**적용 범위:** 리포트 카드, 랭킹 등 모든 수익률 표시

---

### 7. 레이아웃 간격 변경하기

#### 전체 사이트 간격 조정
**파일:** `app/globals.css` (38-43줄)

```css
:root {
  --spacing-xs: 0.25rem;  /* 4px */
  --spacing-sm: 0.5rem;   /* 8px */
  --spacing-md: 1rem;     /* 16px */
  --spacing-lg: 1.5rem;   /* 24px */
  --spacing-xl: 2rem;     /* 32px */
}
```

**사용 예시:**
```tsx
<div style={{ padding: 'var(--spacing-lg)' }}>
  {/* 24px 패딩 */}
</div>
```

---

#### Container 컴포넌트 간격 조정
**파일:** `components/Container.tsx` (37-41줄)

```tsx
const paddingStyles = {
  none: '',
  sm: 'px-4 py-4',
  md: 'px-4 sm:px-6 lg:px-8 py-4 sm:py-8',  // 기본값
  lg: 'px-6 sm:px-8 lg:px-12 py-8 sm:py-12',
};
```

**사용 예시:**
```tsx
<Container padding="lg">넓은 여백</Container>
<Container padding="sm">좁은 여백</Container>
```

---

### 8. 반응형 디자인 수정하기

**Tailwind 반응형 접두사:**
- 기본 (모바일): `px-4` → 모든 화면
- `sm:` (640px+): `sm:px-6` → 태블릿 이상
- `md:` (768px+): `md:text-lg` → 중형 태블릿 이상
- `lg:` (1024px+): `lg:px-8` → 데스크탑
- `xl:` (1280px+): `xl:text-2xl` → 대형 데스크탑

**예시:**
```tsx
<div className="text-sm sm:text-base md:text-lg lg:text-xl">
  {/* 모바일: 작음, 태블릿: 중간, 데스크탑: 큼 */}
</div>
```

---

## 🧩 컴포넌트 구조

### 공통 컴포넌트 (components/)

#### 1. Button
**위치:** `components/Button.tsx`

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'danger'
- `size`: 'sm' | 'md' | 'lg'

**사용 예시:**
```tsx
import Button from '@/components/Button';

<Button variant="primary" size="md" onClick={handleClick}>
  클릭
</Button>
```

---

#### 2. Card
**위치:** `components/Card.tsx`

**Props:**
- `variant`: 'base' | 'interactive' | 'glass' | 'elevated'
- `padding`: 'none' | 'sm' | 'md' | 'lg'

**사용 예시:**
```tsx
import Card from '@/components/Card';

<Card variant="glass" padding="md">
  <h2>제목</h2>
  <p>내용</p>
</Card>
```

**언제 어떤 variant를 쓸까?**
- `base`: 정적인 정보 표시 (호버 없음)
- `interactive`: 클릭 가능한 카드 (리포트 카드 등)
- `glass`: 유리 효과 (프리미엄 느낌)
- `elevated`: 강조할 때 (중요 공지 등)

---

#### 3. Badge
**위치:** `components/Badge.tsx`

**Props:**
- `variant`: 'buy' | 'sell' | 'hold' | 'success' | 'warning' | 'danger' | 'default'
- `size`: 'sm' | 'md' | 'lg'

**사용 예시:**
```tsx
import Badge, { OpinionBadge } from '@/components/Badge';

<Badge variant="success">성공</Badge>
<OpinionBadge opinion="buy" />  {/* 매수 배지 */}
```

---

#### 4. Container
**위치:** `components/Container.tsx`

**Props:**
- `maxWidth`: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'default'
- `padding`: 'none' | 'sm' | 'md' | 'lg'

**사용 예시:**
```tsx
import Container from '@/components/Container';

<Container>
  {/* 기본 레이아웃 (max-width: 1152px) */}
</Container>

<Container maxWidth="full" padding="none">
  {/* 전체 너비, 패딩 없음 */}
</Container>
```

**언제 쓸까?**
- 페이지 전체 감쌀 때: `<Container>...</Container>`
- 섹션 구분: `<Section>...</Section>` (패딩이 더 큼)

---

## 📁 파일 구조

```
value/
├── app/
│   ├── globals.css          ← 🎨 전역 스타일, 디자인 토큰
│   ├── layout.tsx
│   └── [페이지들]/
│
├── components/
│   ├── Button.tsx           ← 🔘 버튼 컴포넌트
│   ├── Card.tsx             ← 📦 카드 컴포넌트
│   ├── Badge.tsx            ← 🏷️ 배지 컴포넌트
│   ├── Container.tsx        ← 📐 레이아웃 컨테이너
│   ├── ReportCard.tsx       ← 리포트 카드 (Card 사용)
│   └── [기타 컴포넌트들]/
│
└── utils/
    └── calculateReturn.ts   ← 수익률 계산 유틸
```

---

## 🎯 수정 우선순위 가이드

### 🔴 긴급 (전체 사이트 영향)
→ `app/globals.css` 수정
- 브랜드 색상 변경
- 폰트 변경
- 전역 간격 조정

### 🟡 중요 (특정 컴포넌트 영향)
→ `components/*.tsx` 수정
- 버튼/카드/배지 디자인 변경
- 컴포넌트 variant 추가

### 🟢 일반 (개별 페이지 영향)
→ `app/[페이지]/page.tsx` 수정
- 페이지별 레이아웃 조정
- 개별 스타일 미세 조정

---

## ❓ 자주 묻는 질문

### Q1. 모든 카드의 테두리 색을 바꾸고 싶어요
**A:** `components/Card.tsx`의 variantStyles에서 `border-gray-200`을 원하는 색으로 변경

```tsx
// Card.tsx (31줄)
base: 'bg-white dark:bg-gray-900 border-2 border-blue-500...'
//                                        ↑ 여기 수정
```

---

### Q2. 버튼에 새로운 스타일을 추가하고 싶어요
**A:** `components/Button.tsx`의 variantStyles에 새 variant 추가

```tsx
// Button.tsx (18줄)
const variantStyles = {
  primary: '...',
  secondary: '...',
  // 새 variant 추가
  custom: 'bg-purple-600 text-white hover:bg-purple-700',
};

// 사용
<Button variant="custom">커스텀 버튼</Button>
```

---

### Q3. 전체 사이트의 메인 색상을 변경하고 싶어요
**A:** `app/globals.css`의 CSS 변수와 `tailwind.config.ts` 모두 수정 필요

```css
/* globals.css */
:root {
  --brand-primary: #8b5cf6;  /* 보라색으로 변경 */
}
```

```ts
// tailwind.config.ts
colors: {
  'electric-blue': {
    500: '#8b5cf6',  // 같은 색으로 변경
    600: '#7c3aed',
    // ...
  }
}
```

---

### Q4. Container의 최대 너비를 바꾸고 싶어요
**A:** `components/Container.tsx`의 maxWidthStyles 수정

```tsx
// Container.tsx (27줄)
default: 'max-w-7xl',  // 1152px → 1280px로 변경
```

---

### Q5. 다크모드 색상만 바꾸고 싶어요
**A:** `dark:` 접두사가 붙은 클래스만 수정

```tsx
// 라이트: white, 다크: gray-800
'bg-white dark:bg-gray-800'

// 다크모드만 바꾸려면
'bg-white dark:bg-gray-950'  // 더 어둡게
```

---

### Q6. 리포트 카드만 다르게 디자인하고 싶어요
**A:** `components/ReportCard.tsx`에서 Card의 variant 변경

```tsx
// ReportCard.tsx (204줄)
<Card variant="elevated" padding="lg">
  {/* variant와 padding 조합으로 다양한 스타일 */}
</Card>
```

---

### Q7. 특정 페이지만 전체 너비로 쓰고 싶어요
**A:** Container의 maxWidth prop 사용

```tsx
// 일반 페이지
<Container>...</Container>  // 1152px 제한

// 전체 너비 페이지
<Container maxWidth="full">...</Container>
```

---

## 🚀 빠른 참고

### 자주 수정하는 파일 Top 3
1. `app/globals.css` - 전역 색상, 폰트
2. `components/Card.tsx` - 카드 디자인
3. `components/Button.tsx` - 버튼 디자인

### 색상 참조표
```
매수(빨강):   #ef4444 (red-500)
매도(파랑):   #3b82f6 (blue-500)
보유(회색):   #6b7280 (gray-500)
성공(초록):   #10b981 (green-500)
경고(노랑):   #f59e0b ((amber-500)
위험(빨강):   #ef4444 (red-500)
```

### Tailwind 간격 참조표
```
p-1  = 4px    gap-1  = 4px
p-2  = 8px    gap-2  = 8px
p-4  = 16px   gap-4  = 16px
p-6  = 24px   gap-6  = 24px
p-8  = 32px   gap-8  = 32px
```

---

## 📞 문제 해결

### 스타일이 적용 안 돼요!
1. 개발 서버 재시작: `Ctrl+C` 후 `npm run dev`
2. 캐시 삭제: `.next` 폴더 삭제 후 재시작
3. Tailwind 클래스가 맞는지 확인

### 컴포넌트를 찾을 수 없어요!
```tsx
// ❌ 잘못된 import
import Button from './Button';

// ✅ 올바른 import
import Button from '@/components/Button';
```

### 다크모드가 작동 안 해요!
- `dark:` 접두사 확인
- 시스템 다크모드 설정 확인
- `globals.css`의 다크모드 색상 확인

---

**🎉 이제 유지보수 준비 완료!**

궁금한 점이 있으면 이 문서를 참고하거나, 해당 파일의 주석을 확인하세요.
