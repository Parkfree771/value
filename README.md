# AntStreet

개인 투자자가 쓰고, 시장이 채점하는 투자 리포트 사이트. 리포트를 쓰는 순간의 가격이 박제되고, 이후 수익률이 매일 자동으로 갱신된다.

## 주요 기능

- **홈 1면** — 수익률 1·2·3위 + 4~15위(더보기 30위), 모닝 브리핑, 구루 포트폴리오, 최신 리포트, 전체 피드
- **리포트** — 종목 검색(한·미·일·중·홍콩·코인), 작성가 자동 기록, 수익률 추적, 댓글·좋아요·북마크
- **랭킹** — 누적·기간(1일/7일/한달) 수익률, 투자자 순위
- **레벨** — 리포트 수·보유 기간·수익률로 쌓이는 점수 (`lib/levels.ts`, `db/migrations/0003_user_levels.sql`)
- **구루 포트폴리오** — SEC 13F 분기 보유 종목
- **경제지표** — FRED (VIX · 금리차 · CPI · M2)

## 기술 스택

- Next.js 16 (App Router) · TypeScript · Tailwind CSS
- Neon — Postgres · Neon Auth · Object Storage
- 가격: 한국투자증권 OpenAPI, Upbit
- 배포: Vercel (`sin1`) · 가격 갱신: GitHub Actions `price-cron`

## 개발

```bash
npm install
npm run dev        # .env 에 DATABASE_URL · NEON_AUTH_* · AWS_*(Storage) · KIS_* 필요
npx tsc --noEmit   # 타입 체크
```

## 디자인

에디토리얼 테마 — 흰 바탕 · 잉크 · 얇은 괘선 · 명조 제목, 버튼은 검정, 포인트만 오렌지.
토큰은 `app/globals.css` (`--theme-*`, `--color-up/down`), 공통 클래스는 `card-base`, `btn-primary`, `headline`, `kicker`, `section-rule`, `label-box`.
파비콘은 `node scripts/build-favicon.mjs` 로 다시 만든다.

## 폴더

- `app/` 페이지·API · `components/` UI (`front/` 홈 1면, `loading/` 로딩)
- `lib/` 서버 로직 (DB·가격·레벨·브리핑) · `utils/` 표시 헬퍼
- `db/migrations/` SQL 마이그레이션 · `scripts/` 운영 스크립트 (`scripts/README.md`)
- `design/legacy-ant/` 옛 개미 원본 보관
