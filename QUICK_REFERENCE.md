# 빠른 참조 가이드 (Quick Reference)

프로젝트에서 가장 자주 수정하는 것들을 한눈에 보는 치트시트입니다.

---

## 🎯 "이거 어디서 바꿔?" 빠른 찾기

| 바꾸고 싶은 것 | 파일 위치 | 줄 번호 |
|-------------|---------|--------|
| **전체 색상** | `app/globals.css` | 12-30 |
| **폰트** | `app/globals.css` | 80-84 |
| **버튼 색상** | `components/Button.tsx` | 18-23 |
| **카드 디자인** | `components/Card.tsx` | 30-44 |
| **배지 색상** | `components/Badge.tsx` | 18-29 |
| **수익률 색상** | `app/globals.css` | 186-195 |
| **페이지 최대 너비** | `components/Container.tsx` | 27-35 |

---

## 🎨 색상 코드 한눈에 보기

```
📊 투자 의견
매수(빨강)   #ef4444
매도(파랑)   #3b82f6
보유(회색)   #6b7280

✅ 상태
성공(초록)   #10b981
경고(노랑)   #f59e0b
에러(빨강)   #ef4444
정보(파랑)   #3b82f6

🎯 브랜드
Primary     #3b82f6
Secondary   #8b5cf6
```

---

## 📐 간격 한눈에 보기

```
Tailwind  실제 크기
p-1       4px
p-2       8px
p-4       16px
p-6       24px
p-8       32px

gap-1     4px
gap-2     8px
gap-4     16px
gap-6     24px
gap-8     32px
```

---

## 📱 반응형 Breakpoint

```
기본(모바일)  0px+      text-sm
sm           640px+    sm:text-base
md           768px+    md:text-lg
lg           1024px+   lg:text-xl
xl           1280px+   xl:text-2xl
2xl          1536px+   2xl:text-3xl
```

**사용 예시:**
```tsx
<div className="text-sm sm:text-base md:text-lg">
  {/* 화면 크기에 따라 자동 조절 */}
</div>
```

---

## 🔧 컴포넌트 빠른 사용법

### Card
```tsx
<Card variant="glass" padding="md">내용</Card>
```
- **variant:** `base` | `interactive` | `glass` | `elevated`
- **padding:** `none` | `sm` | `md` | `lg`

### Button
```tsx
<Button variant="primary" size="md">클릭</Button>
```
- **variant:** `primary` | `secondary` | `outline` | `danger`
- **size:** `sm` | `md` | `lg`

### Badge
```tsx
<Badge variant="success" size="md">완료</Badge>
<OpinionBadge opinion="buy" />
```
- **variant:** `buy` | `sell` | `hold` | `success` | `warning` | `danger` | `default`
- **size:** `sm` | `md` | `lg`

### Container
```tsx
<Container maxWidth="default" padding="md">내용</Container>
```
- **maxWidth:** `sm` | `md` | `lg` | `xl` | `2xl` | `full` | `default`
- **padding:** `none` | `sm` | `md` | `lg`

---

## 🚀 자주 쓰는 Tailwind 클래스

### 레이아웃
```
flex                 플렉스 컨테이너
flex-col             세로 배치
items-center         세로 중앙 정렬
justify-between      양끝 정렬
gap-4                간격 16px
```

### 텍스트
```
text-sm              작은 텍스트
text-lg              큰 텍스트
font-bold            볼드
text-gray-600        회색 텍스트
dark:text-white      다크모드 흰색
```

### 간격
```
p-4                  패딩 16px
px-6                 좌우 패딩 24px
py-2                 상하 패딩 8px
m-4                  마진 16px
mb-6                 아래 마진 24px
```

### 색상
```
bg-white             흰 배경
bg-blue-600          파란 배경
text-red-600         빨간 텍스트
border-gray-200      회색 테두리
```

### 크기
```
w-full               너비 100%
h-screen             높이 100vh
max-w-6xl            최대 너비 1152px
```

### 기타
```
rounded-lg           둥근 모서리
shadow-md            그림자
hover:bg-blue-700    호버 시 배경색
transition-all       애니메이션
```

---

## 🎯 상황별 해결법

### "버튼 전체 너비로 만들고 싶어요"
```tsx
<Button variant="primary" className="w-full">
  버튼
</Button>
```

### "카드에 왼쪽 테두리 추가하고 싶어요"
```tsx
<Card className="border-l-4 border-blue-500">
  내용
</Card>
```

### "모바일에서만 숨기고 싶어요"
```tsx
<div className="hidden md:block">
  {/* 태블릿 이상에서만 보임 */}
</div>
```

### "배지 깜빡이게 하고 싶어요"
```tsx
<Badge variant="danger" className="animate-pulse">
  긴급
</Badge>
```

### "그리드 레이아웃 만들고 싶어요"
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>1</Card>
  <Card>2</Card>
  <Card>3</Card>
</div>
```

---

## 📝 Import 문 복사용

```tsx
// 컴포넌트
import Button from '@/components/Button';
import Card from '@/components/Card';
import Badge, { OpinionBadge } from '@/components/Badge';
import Container, { Section } from '@/components/Container';

// 유틸
import { formatReturn, getReturnColorClass } from '@/utils/calculateReturn';

// Next.js
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// React
import { useState, useEffect } from 'react';
```

---

## 🐛 자주 하는 실수

### ❌ 잘못된 import
```tsx
import Button from './Button';  // 상대 경로
```

### ✅ 올바른 import
```tsx
import Button from '@/components/Button';  // 절대 경로
```

---

### ❌ className 문자열로 안 감싸기
```tsx
<div className={variant === 'primary' && 'bg-blue-600'}>
```

### ✅ 조건부 className
```tsx
<div className={variant === 'primary' ? 'bg-blue-600' : 'bg-gray-600'}>
```

---

### ❌ Tailwind 클래스 동적 생성
```tsx
// 이렇게 하면 Purge 때 제거됨!
<div className={`text-${color}-600`}>
```

### ✅ 완전한 클래스명 사용
```tsx
<div className={color === 'red' ? 'text-red-600' : 'text-blue-600'}>
```

---

## 🔍 디버깅 체크리스트

스타일이 안 먹힐 때:

- [ ] 개발 서버 재시작했나요?
- [ ] `.next` 폴더 삭제했나요?
- [ ] import 경로가 `@/components`로 시작하나요?
- [ ] Tailwind 클래스가 완전한 이름인가요?
- [ ] `dark:` 모드 확인했나요?
- [ ] 브라우저 캐시 지웠나요?

---

## 📞 더 자세한 내용은

- **유지보수 가이드:** `MAINTENANCE_GUIDE.md`
- **컴포넌트 예시:** `COMPONENT_EXAMPLES.md`
- **Tailwind 공식 문서:** https://tailwindcss.com/docs

---

**💡 팁: 이 파일을 북마크해두고 필요할 때 바로 찾아보세요!**
