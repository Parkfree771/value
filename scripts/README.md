# scripts/

프로젝트 운영용 스크립트 모음. 각 파일 상단에 상세 사용법 주석이 있음.

| 파일 | 용도 | 실행 환경 |
|------|------|----------|
| `fetch-13f.ts` | SEC 13F 공시에서 구루 포트폴리오 추출 → `data/guru-portfolios.json` 저장 | 로컬 (분기 1회) |
| `update-filing-prices.ts` | `guru-portfolios.json`의 각 보유 종목에 공시일 종가(`price_at_filing`) 추가 (KIS API 사용, 로컬 dev 서버 필요) | 로컬 (분기 1회) |
| `resolve-cusips.ts` | `guru-portfolios.json`의 미매핑 CUSIP을 OpenFIGI API로 자동 해결 → `cusipMap.ts`에 붙여넣을 코드 출력 | 로컬 (신규 종목/그루 추가 시) |
| `add-us-namekr.ts` | 미국 종목 한글명 보강 | 로컬 (필요 시) |
| `local-price-updater.ts` | 로컬 PC 상주형 가격 업데이트 스케줄러. 사장님 `.bat`에서 호출 (GitHub Actions price-cron과 중복 — 폐기 검토 중) | 로컬 (선택) |
| `cron/update-stock-prices.mjs` | 게시글 종목 가격 갱신 (`--market=ASIA\|US\|CRYPTO\|ALL [--finalize]`, Neon) | GitHub Actions `price-cron` |
| `cron/update-guru-prices.mjs` | 구루 포트폴리오 가격 갱신 (Neon) | GitHub Actions `price-cron` |
| `build-favicon.mjs` | 제호 글꼴로 파비콘·앱 아이콘 생성 (`app/favicon.ico`, `app/icon.png`, `public/icon-*.png`) | 로컬 (디자인 변경 시) |
| `build-stock-name-kr.mjs` | `global-stocks.json` 의 한글명 → `utils/stockNameKr.json` (카드 종목 약칭) | 로컬 (한글명 보강 후) |
| `video-maker/` | 영상 생성 도구 | 로컬 |

13F 분기 갱신 프로세스는 `scripts/13F-UPDATE-GUIDE.md` 참조.

## 공통 환경변수

- `DATABASE_URL` — Neon Postgres 접속 문자열
- `KIS_APP_KEY`, `KIS_APP_SECRET`, `KIS_BASE_URL` — 한국투자 OpenAPI
- `NEXT_PUBLIC_SITE_URL`, `REVALIDATE_SECRET` — ISR 캐시 무효화 호출용

`.env.local`에서 자동 로드됨.

## 실행 방법

```bash
npx tsx scripts/<파일명>.ts
```

## 가격 cron 인프라

상시 가격 갱신은 **GitHub Actions `price-cron`**(`.github/workflows/price-cron.yml`)이 `scripts/cron/*.mjs`를 실행해 담당.
스케줄: ASIA/US 장중 2회 + 장 마감 finalize(예비 1회 포함), 구루 06:30 KST, keep-warm 20분.

**종가 날짜 규칙 (중요):** GitHub 예약 실행은 3~5시간씩 늦게 돌 때가 많다. 그래서 finalize 는 실행 시각이 아니라
거래소 현지 기준 "마지막으로 마감된 거래일"(`shared.mjs lastSessionDate`)로 저장하고, 장중이면 쓰지 않는다(`isMarketOpen`).
예비 실행이 같은 날짜를 다시 써도 값이 같아 안전하다.
`local-price-updater.ts` 계열은 PC `.bat` 호환용 백업 경로. GitHub Actions `price-cron`만으로 충분.

## 모닝 브리핑 (`news/`)

GitHub Actions **`news-briefing`** (`.github/workflows/news-briefing.yml`)이 매일 05:40 KST(예비 06:40 · 08:00)에 `news/run.mjs` 실행.

1. `collect.mjs` — `feeds.json`의 해외 메이저 매체 22곳 RSS, 최근 24시간
2. `prompts.mjs` — Claude(Claude Code CLI, `CLAUDE_CODE_OAUTH_TOKEN` 구독 토큰)가 경제 이슈 10개 선정·새로 작성 → `briefing/briefing.json` + `briefing/archive/{날짜}.json` → 사이트 `/briefing`
   (프롬프트는 project7/news-bots 원문 그대로 — 선정 기준은 손대지 말 것)
3. 그중 가장 핫한 5개 → `render.mjs`가 표지 + 카드 5장(1080×1350, 신문 1면 톱 형식) + 세로 릴스(1080×1920, 약 30초) + 캡션 → `instagram/{날짜}/` (게시는 직접)

로컬 미리보기: `node --env-file=.env scripts/news/run.mjs --dry-run` → `scripts/news/out/{날짜}/` (업로드 없음)
