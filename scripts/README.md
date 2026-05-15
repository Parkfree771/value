# scripts/

프로젝트 운영용 스크립트 모음. 각 파일 상단에 상세 사용법 주석이 있음.

| 파일 | 용도 | 실행 환경 |
|------|------|----------|
| `fetch-13f.ts` | SEC 13F 공시에서 구루 포트폴리오 추출 → `data/guru-portfolios.json` 저장 | 로컬 (분기 1회) |
| `update-filing-prices.ts` | `guru-portfolios.json`의 각 보유 종목에 공시일 종가(`price_at_filing`) 추가 (KIS API 사용, 로컬 dev 서버 필요) | 로컬 (분기 1회) |
| `resolve-cusips.ts` | `guru-portfolios.json`의 미매핑 CUSIP을 OpenFIGI API로 자동 해결 → `cusipMap.ts`에 붙여넣을 코드 출력 | 로컬 (신규 종목/그루 추가 시) |
| `add-us-namekr.ts` | 미국 종목 한글명 보강 | 로컬 (필요 시) |
| `local-price-updater.ts` | 로컬 PC 상주형 가격 업데이트 스케줄러. 사장님 `.bat`에서 호출 (Supabase Edge Function cron과 중복 — 폐기 검토 중) | 로컬 (선택) |
| `github-update-prices.ts` | `local-price-updater.ts`가 spawn하는 가격 갱신 본체 (Supabase) | 로컬 (자동) |
| `github-update-guru-prices.ts` | 구루 포트폴리오 가격 갱신 (Supabase) | 로컬 (자동) |
| `recolor-favicon.js`, `recolor-favicons.js`, `recolor-logo.js` | 아이콘 색상 일괄 변경 | 로컬 (디자인 변경 시) |
| `test-font.js` | 폰트 렌더링 검증 | 로컬 (디자인) |
| `video-maker/` | 영상 생성 도구 | 로컬 |

13F 분기 갱신 프로세스는 `scripts/13F-UPDATE-GUIDE.md` 참조.

## 공통 환경변수

- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` — Supabase service_role 접근
- `KIS_APP_KEY`, `KIS_APP_SECRET`, `KIS_BASE_URL` — 한국투자 OpenAPI
- `NEXT_PUBLIC_SITE_URL`, `REVALIDATE_SECRET` — ISR 캐시 무효화 호출용

`.env.local`에서 자동 로드됨.

## 실행 방법

```bash
npx tsx scripts/<파일명>.ts
```

## 가격 cron 인프라

상시 가격 갱신은 **Supabase Edge Functions + pg_cron**이 담당 (`supabase/functions/update-stock-prices`, `update-guru-prices`).
`local-price-updater.ts` 계열은 PC `.bat` 호환용 백업 경로. Supabase 측만으로 충분.
