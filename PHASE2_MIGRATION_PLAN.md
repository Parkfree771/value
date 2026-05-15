# Supabase 마이그레이션 상태 (2026-05-15)

> 다음 세션에 "이어서 해" 하면 이 문서를 먼저 읽고 픽업.

## ✅ Phase 1 — 스키마 (Postgres) — 완료
원격 적용된 마이그레이션 12개 (`supabase/migrations/`):
- 0001 tables, 0002 indexes, 0003 functions_triggers, 0004 rls_policies, 0005 views
- 0006 security_hardening, 0007 grants, 0008 price_tables, 0009 grants_service_role
- 0010 storage_media_bucket, 0011 guru_prices
- **0012 users_is_virtual** ← Phase 3에서 추가됨

## ✅ Phase 2 — 코드 마이그레이션 (Firebase → Supabase) — 완료
- Auth, User, Posts, Comments, Likes, Bookmarks, Stats, Badges, Admin 전부 Supabase
- 가격 시스템 Postgres화 (priceHistory, priceCache, /api/feed/*)
- 백필 완료 (price_history 2,061 + current_prices 54 + guru_prices 309)
- Cron 스크립트 + GitHub Actions YAML
- Storage 'media' 버킷

### 검증 중 추가 발견·수정한 누락분 (2026-05-14)
- `/api/reports/[id]/view` Firebase Firestore → Postgres (조회수 라우트)
- `/api/users/by-nickname/[nickname]` Firebase → Postgres (사용자 페이지 깨짐)
- 메인 페이지 SSR `app/page.tsx` getInitialFeed: Firebase feed.json → Postgres 직접 쿼리
- 이미지/PDF 업로드 파일명: 한글 등 non-ASCII → `_` 치환 (Storage 키 제약)
- CSP `connect-src`에 `*.supabase.co` 추가 (요청 차단 해제)
- AdSense/JSON-LD를 `next/script`로 (hydration mismatch 해결)
- `comment_count` UI 노출 plumbing (피드 카드에 "댓글 N")

## ✅ Phase 3 — 데이터 이전 (Firestore → Postgres) — 완료 (2026-05-15)
| 항목 | 이전 결과 |
|---|---|
| users | 19명 (가상 18 + Boltzmann admin 1) |
| posts | 76개 |
| user_badges | 47개 |
| bookmarks | 0 (Firestore 2개 모두 ghost user — 정상 스킵) |
| post_likes | 0 (Firestore에도 0) |
| comments | 0 (Firestore에도 0) |

### Phase 3 산출물
- `supabase/migrations/0012_users_is_virtual.sql`
- `scripts/phase3-dry-run.ts` / `phase3-dry-run-2.ts` / `phase3-dry-run-3.ts`
- `scripts/phase3-migrate.ts` — 단계별 실행 (users/posts/bookmarks/badges)
- `scripts/phase3-fix-manligyeong.ts` — 한글 이메일 fallback
- `scripts/output/` — 매핑/리포트 (gitignore, UID·이메일 민감)

### Phase 3 결정사항 (기록)
- 가상 작성자: auth.users에 가짜 이메일(`@local.invalid` 또는 `@internal.antstreet.local`)로 등록 + 영구 ban + `public.users.is_virtual=true`
- 사장님 닉네임: Firestore의 `Boltzmann`으로 복원
- 가상/실 작성자 구분은 **DB 컬럼만** (UI엔 노출 안 함) — 사용자 명시 요구
- 한글 이메일은 Supabase Admin API가 거부 → ASCII fallback으로 처리

## ✅ 캐시 전략 — 가격 cron 트리거 (2026-05-15)
- 메인/랭킹/검색 페이지 ISR `revalidate = 3600` (1시간)
- 글 작성/삭제/수정 시 `revalidatePath('/')`로 즉시 무효화 (이미 `/api/feed`, `/api/reports/[id]`에 적용)
- 가격 cron(`scripts/github-update-prices.ts`) 완료 시 `/api/revalidate` 호출
  - `x-revalidate-secret` 헤더 인증 (cron용) + admin 인증 (대시보드용) 둘 다 지원
- 결과: 평상시 egress 거의 0, 가격/글 변동 시 즉시 반영

## ✅ 가격 cron 개선 (2026-05-15)
- KIS 호출 간격: 50ms → **250ms** (안전마진)
- `MARKET_TYPE=CRYPTO` 추가 (코인만 처리)
- 시작 즉시 실행은 **현재 KST 시간대 자동 감지** (장 마감 시간엔 코인만)
- 매시간 cron은 CRYPTO 전용으로 변경
- Windows `spawn EINVAL` 수정 (`shell: process.platform === 'win32'`)

## ❌ 남은 작업

### A. 배포 환경변수
- ✅ **Vercel env 완료** (2026-05-15)
- **GitHub Actions Repo Secrets** — `Settings > Secrets and variables > Actions`에서 추가:
  | 키 | 비고 |
  |---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
  | `SUPABASE_SECRET_KEY` | service_role 시크릿 |
  | `KIS_APP_KEY` / `KIS_APP_SECRET` | KIS 한국투자 |
  | `SITE_URL` | `https://www.antstreet.kr` 같은 prod URL (trailing slash 없이) |
  | `REVALIDATE_SECRET` | Vercel과 동일한 값 |

### B. GitHub Actions 워크플로우 (2026-05-15 수정 완료)
- 깨져있던 `Revalidate pages` curl 스텝 제거 — secret 헤더 없어서 401나던 것
- `github-update-prices.ts` 안에서 revalidate 호출하도록 일원화. 환경변수 `NEXT_PUBLIC_SITE_URL` + `REVALIDATE_SECRET` 추가
- guru 워크플로우는 무변경 (CDN cache 24h + 일 1회 cron이라 revalidate 불필요)
- **검증 방법**: Secrets 입력 후 Actions 탭에서 `workflow_dispatch` 수동 트리거 → 로그에서 `[CRON] revalidate /: 200` 확인

### C. 보안 권장
- **Supabase DB 비밀번호 재발급** — 채팅으로 connection string 노출됐음
- Firebase Auth Provider 비활성화 (더 이상 안 씀)

### D. 점검 필요 (별건)
- **미들웨어**: 온보딩 미완료 사용자가 강제 redirect 안 되고 통과하는 점
- 필요 시 별도 개선

## 핵심 파일 포인터
| 카테고리 | 파일 |
|---|---|
| Supabase 클라이언트 | `utils/supabase/{client,server,middleware}.ts` |
| 인증 | `lib/supabase-auth.ts`, `lib/supabase-admin.ts`, `middleware.ts` |
| 컨텍스트 | `contexts/AuthContext.tsx`, `contexts/BookmarkContext.tsx` |
| 가격 cron | `scripts/local-price-updater.ts` (배경화면 .bat → 이거 호출), `scripts/github-update-prices.ts` |
| 캐시 무효화 | `/api/revalidate`, `/api/feed` POST, `/api/reports/[id]` DELETE |
| Phase 3 | `scripts/phase3-migrate.ts` |
