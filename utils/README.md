# 수익률 계산 유틸리티

## 개요

이 유틸리티는 투자 의견(매수/매도)에 따라 자동으로 포지션 타입을 결정하고 정확한 수익률을 계산합니다.

**중요:**
- **매수 = 롱(Long) 포지션**: 가격 상승 시 수익
- **매도 = 숏(Short) 포지션**: 가격 하락 시 수익
- **보유 = 롱(Long) 포지션**: 기본적으로 롱 포지션으로 계산

## 주요 함수

### 1. `calculateReturn(initialPrice, currentPrice, positionType)`

포지션 타입에 따라 수익률을 계산합니다.

**매개변수:**
- `initialPrice`: 리포트 작성 당시의 가격
- `currentPrice`: 현재 가격
- `positionType`: 'long' 또는 'short'

**반환값:**
- 수익률 (백분율)

**예시:**

```typescript
// 롱 포지션
calculateReturn(100000, 120000, 'long')  // → 20 (20% 수익)
calculateReturn(100000, 80000, 'long')   // → -20 (20% 손실)

// 숏 포지션
calculateReturn(100000, 80000, 'short')  // → 20 (20% 수익 - 가격 하락)
calculateReturn(100000, 120000, 'short') // → -20 (20% 손실 - 가격 상승)
```

### 2. `formatReturn(returnRate, decimalPlaces)`

수익률을 포맷팅합니다.

**예시:**

```typescript
formatReturn(12.34)   // → "+12.34%"
formatReturn(-5.67)   // → "-5.67%"
formatReturn(0)       // → "+0.00%"
```

### 3. `getReturnColorClass(returnRate)`

수익률에 따른 Tailwind CSS 색상 클래스를 반환합니다.

**예시:**

```typescript
getReturnColorClass(10)   // → "text-green-600 dark:text-green-400"
getReturnColorClass(-10)  // → "text-red-600 dark:text-red-400"
getReturnColorClass(0)    // → "text-gray-600 dark:text-gray-400"
```

## 포지션 타입별 수익률 계산 방식

### 롱 (Long) 포지션

**정의:** 가격이 상승할 것으로 예상하고 매수하는 전략

**수익률 계산:**
```
수익률 = (현재가격 - 작성당시가격) / 작성당시가격 × 100
```

**예시:**
- 작성 당시: 100,000원
- 현재: 120,000원
- 수익률: **(120,000 - 100,000) / 100,000 × 100 = +20%** ✅ 수익

### 숏 (Short) 포지션

**정의:** 가격이 하락할 것으로 예상하고 공매도하는 전략

**수익률 계산:**
```
수익률 = (작성당시가격 - 현재가격) / 작성당시가격 × 100
```

**예시:**
- 작성 당시: 100,000원
- 현재: 80,000원
- 수익률: **(100,000 - 80,000) / 100,000 × 100 = +20%** ✅ 수익

## 사용 예시

### ReportCard 컴포넌트에서 사용

```typescript
import { calculateReturn, formatReturn, getReturnColorClass } from '@/utils/calculateReturn';

function ReportCard({ initialPrice, currentPrice, positionType }) {
  const returnRate = calculateReturn(initialPrice, currentPrice, positionType);

  return (
    <div className={getReturnColorClass(returnRate)}>
      수익률: {formatReturn(returnRate)}
    </div>
  );
}
```

### 리포트 작성 시 데이터 저장

```typescript
// 투자 의견에 따라 포지션 타입 자동 결정
const positionType = opinion === 'sell' ? 'short' : 'long';

const newReport = {
  // ... 기타 필드
  opinion: 'buy', // 또는 'sell', 'hold'
  initialPrice: stockData.currentPrice,
  currentPrice: stockData.currentPrice,
  positionType: positionType, // 자동으로 결정됨
};
```

### 투자 의견별 포지션 타입 매핑

| 투자 의견 | 포지션 타입 | 수익 조건 |
|---------|------------|----------|
| 매수 (buy) | 롱 (long) | 가격 상승 |
| 매도 (sell) | 숏 (short) | 가격 하락 |
| 보유 (hold) | 롱 (long) | 가격 상승 |
