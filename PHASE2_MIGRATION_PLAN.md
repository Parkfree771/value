# Supabase 마이그레이션 상태 (2026-05-14)

> 다음 세션에 "Phase 3 진행해" 또는 "검증 시작" 하면 이 문서를 먼저 읽고 픽업.

## ✅ 완료된 작업

### Phase 1: 스키마 (Postgres)
원격 적용된 마이그레이션 11개 (`supabase/migrations/`):
- `0001_tables` — 10개 테이블 (users, posts, post_likes, bookmarks, comments, comment_likes, user_badges, user_consents, settings, guru_portfolios)
- `0002_indexes`
- `0003_functions_triggers` — 좋아요/댓글 카운트 자동 갱신 + handle_new_auth_user 트리거
- `0004_rls_policies`
- `0005_views` — user_stats VIEW
- `0006_security_hardening` — 함수 search_path + handle_new_auth_user REST 차단
- `0007_grants` — anon/authenticated 권한
- `0008_price_tables` — price_history, current_prices
- `0009_grants_service_role` — service_role 권한
- `0010_storage_media_bucket` — Supabase Storage 'media' 버킷 + RLS
- `0011_guru_prices` — guru_prices 테이블

### Phase 2: 코드 마이그레이션 (Firebase → Supabase)
- **Auth**: `middleware.ts`, `lib/supabase-auth.ts`, `contexts/AuthContext.tsx`, `/auth/callback`, `admin-check` ✅
- **User**: `lib/users.ts`, `/api/user/profile`, onboarding ✅
- **Posts**: `/api/reports/*`, `/reports/[id]` SSR, `/write` 페이지 ✅
- **Comments**: `/api/reports/[id]/comments/*` (트리거가 카운터 자동) ✅
- **Likes + Bookmarks**: `/api/reports/[id]/like`, `BookmarkContext`, UI 카운트 노출 ✅
- **Stats + Badges**: `lib/userStats.ts` (Postgres 기반), `/api/user/badge`, mypage ✅
- **Admin**: `lib/admin/adminVerify.ts`, `/api/admin/{users,posts,comments,stats}` ✅
- **Cleanup**: sitemap.ts, feed.xml, 모든 Bearer 토큰 → 쿠키 세션 ✅

### Phase 2.5: 가격 데이터 + 이미지
- **가격 시스템 Postgres화**: `lib/priceHistory.ts`, `lib/priceCache.ts`, `/api/feed/*`, `/api/prices-history/[ticker]` ✅
- **백필 완료**: price_history 2,061행, current_prices 54행, guru_prices 309행
- **Cron 스크립트 Postgres화**: `scripts/github-update-prices.ts`, `scripts/github-update-guru-prices.ts`, `scripts/local-price-updater.ts` ✅
- **GitHub Actions YAML 갱신** (Firebase env 제거 → Supabase env) ✅
- **Supabase Storage 'media' 버킷**: 신규 이미지/PDF 업로드 전환 ✅ (기존 Firebase URL은 그대로 유효)

### 사용자가 이미 한 일
- Google OAuth provider 설정 (Supabase Dashboard + Google Cloud Console) ✅
- 로컬에서 Google 로그인 검증 완료 ✅

---

## ❌ 남은 작업

### A. Phase 3: 기존 데이터 이전 (Firestore → Postgres) — **결정 보류 중**
현재 Postgres가 거의 비어있음. 사장님 본인 계정 외에는:
- 글: 0개 (Firestore에 남아있음)
- 댓글, 좋아요, 북마크, 배지: 0개
- 가상 작성자 19명: 미생성

**옵션** (다음 세션에서 결정):
- **A1**: 가상 작성자 19명 생성 후 모든 데이터 이전 (가장 권장, 30~60분)
- **A2**: 새 시작 (기존 콘텐츠 폐기)
- **A3**: 선택적 이전 (예: 최근 글만)

**A1 진행 시 해결할 문제**:
- Firebase UID ↔ Supabase UID 매핑 (이메일 기반 매핑 + 가상 작성자는 신규 생성)
- 가상 작성자 auth.users 행 어떻게 만들지 (Admin API로 생성 or 스키마에서 FK 완화)
- 답글의 parent_id, 좋아요/북마크의 user_id 참조 무결성

### B. 사용자 외부 작업 (코드 작업 없음)
- **GitHub Repo Secrets 추가** (cron 작동시키려면):
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://zuuvksnzzownauunfygt.supabase.co`
  - `SUPABASE_SECRET_KEY` = `.env.local`의 `SUPABASE_SECRET_KEY` 값
- **Vercel/Netlify 배포 환경변수** 동일하게 추가
- **(선택) Firebase Auth Provider 비활성화** — 더 이상 안 씀

### C. 검증 (집에서 진행 예정)
- `npm run dev` → 로그인·온보딩·글 작성·좋아요·북마크·댓글·차트·마이페이지·관리자
- 콘솔 에러 잡기

---

## 핵심 파일 포인터

| 카테고리 | 파일 |
|---|---|
| Supabase 클라이언트 | `utils/supabase/{client,server,middleware}.ts` |
| 인증 헬퍼 | `lib/supabase-auth.ts`, `lib/supabase-admin.ts`, `middleware.ts` |
| 인증 컨텍스트 | `contexts/AuthContext.tsx`, `contexts/BookmarkContext.tsx` |
| 가격 로직 | `lib/priceHistory.ts`, `lib/priceCache.ts` |
| Cron 스크립트 | `scripts/github-update-prices.ts`, `scripts/github-update-guru-prices.ts`, `scripts/local-price-updater.ts` |
| 백필 (실행됨) | `scripts/backfill-prices.ts`, `scripts/backfill-guru-prices.ts` |
| GitHub Actions | `.github/workflows/update-*.yml` |

## 남아있는 Firebase 의존성 (의도된 것)
- **이미지·feed.json·prices-history JSON 파일들** (Storage): 기존 글의 이미지 URL이 Firebase Storage 가리키므로 유지. 새 업로드는 Supabase로
- `lib/firebase.ts` (storage export만), `lib/firebase-admin.ts` (adminStorage만)

## 다음 세션 진입 시 체크
1. 이 문서 + `memory/project_supabase_migration.md` 읽기
2. 사용자가 "검증 결과 X 안 됨" → 디버그
3. 사용자가 "Phase 3 진행" → 위 A 옵션 결정받고 진행
4. 사용자가 "GitHub Secrets 다 추가했어" → cron 수동 트리거 한 번 돌려서 검증
