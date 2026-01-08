# 컴포넌트 사용 예시 (Component Examples)

이 문서는 프로젝트의 공통 컴포넌트를 어떻게 사용하는지 실제 예제로 보여줍니다.

---

## 📦 Card 컴포넌트

### 기본 사용

```tsx
import Card from '@/components/Card';

export default function MyPage() {
  return (
    <Card>
      <h2>제목</h2>
      <p>내용</p>
    </Card>
  );
}
```

### Variant 별 사용 예시

```tsx
// 1. 정적 정보 카드 (호버 효과 없음)
<Card variant="base" padding="md">
  <h3>공지사항</h3>
  <p>시스템 점검 안내입니다.</p>
</Card>

// 2. 클릭 가능한 인터랙티브 카드
<Card variant="interactive" padding="lg" onClick={() => router.push('/detail')}>
  <h3>리포트 제목</h3>
  <p>클릭해서 자세히 보기</p>
</Card>

// 3. 유리 효과 카드 (프리미엄 느낌)
<Card variant="glass" padding="md">
  <h3>프리미엄 콘텐츠</h3>
  <p>반투명 배경과 블러 효과</p>
</Card>

// 4. 그림자 강조 카드
<Card variant="elevated" padding="lg">
  <h3>중요 공지</h3>
  <p>눈에 띄는 강조 효과</p>
</Card>
```

### 실전 예시: 리포트 목록

```tsx
export default function ReportList() {
  const reports = [
    { id: 1, title: '삼성전자 분석', content: '...' },
    { id: 2, title: 'NVIDIA 전망', content: '...' },
  ];

  return (
    <div className="space-y-4">
      {reports.map(report => (
        <Card
          key={report.id}
          variant="interactive"
          padding="md"
          onClick={() => router.push(`/reports/${report.id}`)}
        >
          <h3 className="font-bold text-lg mb-2">{report.title}</h3>
          <p className="text-gray-600 dark:text-gray-400">{report.content}</p>
        </Card>
      ))}
    </div>
  );
}
```

---

## 🔘 Button 컴포넌트

### 기본 사용

```tsx
import Button from '@/components/Button';

export default function MyPage() {
  return (
    <Button onClick={handleSubmit}>
      제출하기
    </Button>
  );
}
```

### Variant & Size 조합

```tsx
// Primary 버튼 (기본)
<Button variant="primary" size="md">
  확인
</Button>

// Secondary 버튼
<Button variant="secondary" size="sm">
  취소
</Button>

// Outline 버튼
<Button variant="outline" size="lg">
  자세히 보기
</Button>

// Danger 버튼 (삭제 등)
<Button variant="danger" size="md">
  삭제
</Button>
```

### 실전 예시: 폼 액션

```tsx
export default function ReportForm() {
  const [loading, setLoading] = useState(false);

  return (
    <form>
      {/* 폼 내용 */}

      <div className="flex gap-3 justify-end">
        <Button
          variant="secondary"
          size="md"
          onClick={() => router.back()}
        >
          취소
        </Button>

        <Button
          variant="primary"
          size="md"
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading ? '제출 중...' : '제출하기'}
        </Button>
      </div>
    </form>
  );
}
```

### 실전 예시: 액션 버튼 그룹

```tsx
<div className="flex gap-2">
  <Button variant="outline" size="sm">
    <svg className="w-4 h-4 mr-1">...</svg>
    좋아요
  </Button>

  <Button variant="outline" size="sm">
    <svg className="w-4 h-4 mr-1">...</svg>
    공유
  </Button>

  <Button variant="danger" size="sm">
    삭제
  </Button>
</div>
```

---

## 🏷️ Badge 컴포넌트

### 기본 사용

```tsx
import Badge from '@/components/Badge';

export default function MyPage() {
  return (
    <Badge variant="success">
      완료
    </Badge>
  );
}
```

### 투자 의견 배지

```tsx
import { OpinionBadge } from '@/components/Badge';

// 방법 1: OpinionBadge 사용 (권장)
<OpinionBadge opinion="buy" />   {/* 매수 */}
<OpinionBadge opinion="sell" />  {/* 매도 */}
<OpinionBadge opinion="hold" />  {/* 보유 */}

// 방법 2: Badge로 직접 사용
<Badge variant="buy">매수</Badge>
<Badge variant="sell">매도</Badge>
<Badge variant="hold">보유</Badge>
```

### 상태 배지

```tsx
// 성공
<Badge variant="success" size="md">
  수익 확정 완료
</Badge>

// 경고
<Badge variant="warning" size="sm">
  주의 필요
</Badge>

// 위험
<Badge variant="danger" size="lg">
  손실 위험
</Badge>

// 기본
<Badge variant="default" size="md">
  일반
</Badge>
```

### 실전 예시: 리포트 카드에서 사용

```tsx
export default function ReportCard({ opinion, status }) {
  return (
    <Card variant="glass">
      <div className="flex items-center gap-2 mb-2">
        <h3>삼성전자</h3>
        <OpinionBadge opinion={opinion} />

        {status === 'closed' && (
          <Badge variant="success" size="sm">
            확정 완료
          </Badge>
        )}
      </div>
    </Card>
  );
}
```

---

## 📐 Container 컴포넌트

### 기본 사용

```tsx
import Container from '@/components/Container';

export default function MyPage() {
  return (
    <Container>
      <h1>페이지 제목</h1>
      <p>내용...</p>
    </Container>
  );
}
```

### MaxWidth 조절

```tsx
// 작은 컨테이너 (640px)
<Container maxWidth="sm">
  <p>좁은 콘텐츠 영역</p>
</Container>

// 기본 컨테이너 (1152px) - 프로젝트 표준
<Container maxWidth="default">
  <p>일반 페이지 콘텐츠</p>
</Container>

// 큰 컨테이너 (1280px)
<Container maxWidth="xl">
  <p>넓은 콘텐츠 영역</p>
</Container>

// 전체 너비
<Container maxWidth="full">
  <p>화면 전체 너비 사용</p>
</Container>
```

### Padding 조절

```tsx
// 패딩 없음
<Container padding="none">
  <img src="hero.jpg" className="w-full" />
</Container>

// 작은 패딩
<Container padding="sm">
  <p>좁은 여백</p>
</Container>

// 중간 패딩 (기본값)
<Container padding="md">
  <p>일반 여백</p>
</Container>

// 큰 패딩
<Container padding="lg">
  <p>넓은 여백</p>
</Container>
```

### 실전 예시: 전체 페이지 레이아웃

```tsx
export default function ReportsPage() {
  return (
    <Container>
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">리포트 목록</h1>
        <p className="text-gray-600">최신 투자 리포트를 확인하세요</p>
      </div>

      {/* 필터바 */}
      <FilterBar />

      {/* 리포트 목록 */}
      <div className="space-y-4 mt-6">
        {reports.map(report => (
          <ReportCard key={report.id} {...report} />
        ))}
      </div>
    </Container>
  );
}
```

### 실전 예시: Section 컴포넌트

```tsx
import { Section } from '@/components/Container';

export default function HomePage() {
  return (
    <>
      {/* Hero 섹션 - 전체 너비 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600">
        <Container maxWidth="full" padding="lg">
          <h1 className="text-4xl text-white">환영합니다</h1>
        </Container>
      </div>

      {/* 콘텐츠 섹션 - 일반 너비 */}
      <Section>
        <h2>최신 리포트</h2>
        {/* 리포트 목록 */}
      </Section>

      {/* 푸터 - 전체 너비 */}
      <footer className="bg-gray-900">
        <Container padding="lg">
          <p className="text-white">© 2026 Value</p>
        </Container>
      </footer>
    </>
  );
}
```

---

## 🎨 컴포넌트 조합 예시

### 예시 1: 프로필 카드

```tsx
<Card variant="base" padding="lg">
  <div className="flex items-center gap-4">
    <img src="/avatar.jpg" className="w-16 h-16 rounded-full" />
    <div>
      <h3 className="font-bold text-lg">워렌 버핏</h3>
      <Badge variant="success" size="sm">인증된 투자자</Badge>
    </div>
  </div>

  <div className="mt-4 flex gap-2">
    <Button variant="primary" size="sm">팔로우</Button>
    <Button variant="outline" size="sm">메시지</Button>
  </div>
</Card>
```

### 예시 2: 통계 대시보드

```tsx
<Container>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card variant="elevated" padding="md">
      <p className="text-gray-500 text-sm">총 수익률</p>
      <p className="text-3xl font-bold text-red-600">+24.5%</p>
      <Badge variant="success" size="sm" className="mt-2">
        역대 최고
      </Badge>
    </Card>

    <Card variant="elevated" padding="md">
      <p className="text-gray-500 text-sm">보유 종목</p>
      <p className="text-3xl font-bold">12개</p>
    </Card>

    <Card variant="elevated" padding="md">
      <p className="text-gray-500 text-sm">리포트 수</p>
      <p className="text-3xl font-bold">47개</p>
    </Card>
  </div>
</Container>
```

### 예시 3: 알림 카드

```tsx
<Card variant="base" padding="md" className="border-l-4 border-yellow-500">
  <div className="flex items-start gap-3">
    <Badge variant="warning">중요</Badge>
    <div>
      <h4 className="font-semibold mb-1">시스템 점검 안내</h4>
      <p className="text-sm text-gray-600">
        2026년 1월 10일 02:00-04:00 시스템 점검이 예정되어 있습니다.
      </p>
      <Button variant="outline" size="sm" className="mt-3">
        자세히 보기
      </Button>
    </div>
  </div>
</Card>
```

### 예시 4: 리포트 상세 페이지

```tsx
export default function ReportDetail({ report }) {
  return (
    <Container maxWidth="lg">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold">{report.stockName}</h1>
          <span className="text-gray-500">{report.ticker}</span>
          <OpinionBadge opinion={report.opinion} />
        </div>
        <h2 className="text-xl text-gray-700 dark:text-gray-300">
          {report.title}
        </h2>
      </div>

      {/* 수익률 카드 */}
      <Card variant="glass" padding="lg" className="mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500">작성 시 가격</p>
            <p className="text-xl font-bold">${report.initialPrice}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">현재 가격</p>
            <p className="text-xl font-bold">${report.currentPrice}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">수익률</p>
            <p className="text-2xl font-black text-red-600">
              +{report.returnRate}%
            </p>
          </div>
        </div>
      </Card>

      {/* 본문 */}
      <Card variant="base" padding="lg">
        <div dangerouslySetInnerHTML={{ __html: report.content }} />
      </Card>

      {/* 액션 버튼 */}
      <div className="flex gap-3 mt-6">
        <Button variant="primary" size="lg">
          <svg className="w-5 h-5 mr-2">...</svg>
          좋아요
        </Button>
        <Button variant="outline" size="lg">
          공유하기
        </Button>
      </div>
    </Container>
  );
}
```

---

## 💡 팁

### 1. className 추가로 커스터마이징

모든 컴포넌트는 `className` prop을 받아서 추가 스타일링이 가능합니다:

```tsx
<Card variant="base" className="border-l-4 border-blue-500">
  {/* 왼쪽에 파란 테두리 추가 */}
</Card>

<Button variant="primary" className="w-full">
  {/* 버튼을 전체 너비로 */}
</Button>

<Badge variant="success" className="animate-pulse">
  {/* 깜빡이는 애니메이션 추가 */}
</Badge>
```

### 2. 조건부 렌더링

```tsx
{isClosed && (
  <Badge variant="success">확정 완료</Badge>
)}

{!isClosed && (
  <Button variant="primary" onClick={handleClose}>
    수익 확정하기
  </Button>
)}
```

### 3. 반응형 그리드

```tsx
<Container>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <Card>카드 1</Card>
    <Card>카드 2</Card>
    <Card>카드 3</Card>
    {/* 모바일: 1열, 태블릿: 2열, 데스크탑: 3열 */}
  </div>
</Container>
```

---

**이 예시들을 참고해서 자유롭게 컴포넌트를 조합하세요!**
