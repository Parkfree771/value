# WORD WATCH 글 작성 양식

아래 양식을 채워서 전달해주세요. 그대로 코드에 추가하겠습니다.

---

## 기본 정보

**이름 (영어):**
예시: David Swartz

**소속 (영어):**
예시: Senior Equity Analyst, Morningstar

**작성일시 (UTC 기준):**
예시: 2025-12-18T21:38:00Z
참고: 한국시간 오전 6시 38분 = UTC 전날 21시 38분

**기준일 (YYYY-MM-DD):**
예시: 2025-12-19

---

## 종목 정보

**기업명:**
예시: Nike, Inc.

**티커:**
예시: NKE

**상장사:**
예시: NYSE (또는 NASDAQ)

**작성 당시 주가 (USD):**
예시: 65.63

**매수/매도:**
LONG (상승 예측/매수) 또는 SHORT (하락 예측/매도)

---

## 배지 정보

**배지 종류:**
BULLISH (강세), BEARISH (약세), WARNING (경고), OPINION (의견)

**배지 강도:**
HIGH, MEDIUM, LOW

---

## 본문 내용

**제목:**
예시: 나이키(NKE): 브랜드 고전 딛고 향후 2년 강력한 성장 전망

**요약 (2-3줄):**
예시: 모닝스타의 데이비드 스워츠 분석가는 나이키가 2026 회계연도 2분기 실적에서 예상치를 상회하며 브랜드 반등 신호를 보였다고 분석했습니다.

**본문 내용 (HTML 형식):**
```html
<h3>1. 실적 발표</h3>
<p>본문 내용...</p>
<ul>
  <li>항목 1</li>
  <li>항목 2</li>
</ul>

<h3>2. 분석가 전망</h3>
<p>본문 내용...</p>

<p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
  * 출처: 출처명<br/>
  * 분석가: 이름 (직함)
</p>
```

**원문 링크:**
예시: https://finance.yahoo.com/video/nike-analyst-expects-strong-next-213852720.html

---

## 작성 예시 (나이키)

```
이름: David Swartz
소속: Senior Equity Analyst, Morningstar
작성일시: 2025-12-18T21:38:00Z
기준일: 2025-12-19

기업명: Nike, Inc.
티커: NKE
상장사: NYSE
작성 당시 주가: 65.63
매수/매도: LONG

배지: BULLISH
강도: HIGH

제목: 나이키(NKE): 브랜드 고전 딛고 향후 2년 강력한 성장 전망
요약: 모닝스타의 데이비드 스워츠 분석가는 나이키가 2026 회계연도 2분기 실적에서 예상치를 상회하며 브랜드 반등 신호를 보였다고 분석했습니다.

본문: [HTML 내용]
원문 링크: https://finance.yahoo.com/video/nike-analyst-expects-strong-next-213852720.html
```

---

## 주의사항

1. **작성일시**는 UTC 기준으로 작성 (한국시간 -9시간)
2. **티커**는 대문자로 작성 (예: NKE, TSLA, AAPL)
3. **상장사**는 NYSE, NASDAQ, AMEX 등
4. **주가**는 소수점 둘째자리까지 (예: 65.63)
5. **본문**은 HTML 형식으로 작성 (h3, p, ul, li 등 사용)
6. 한국어/영어 혼용 가능하지만 **이름과 소속은 영어**로 작성
