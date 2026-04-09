# scripts/

프로젝트 운영용 스크립트 모음. 각 파일 상단에 상세 사용법 주석이 있음.

| 파일 | 용도 | 실행 환경 |
|------|------|----------|
| `change-author.ts` | 게시글 작성자 닉네임 일괄 변경 + 신규 유저 자동 생성 (posts 컬렉션 + feed.json 동기화) | 로컬 (수동) |
| `seed-data.ts` | 테스트용 가짜 사용자/게시글 일괄 생성 (users + posts + feed.json) | 로컬 (수동) |
| `fetch-13f.ts` | SEC 13F 공시에서 구루 포트폴리오 추출 → `data/guru-portfolios.json` 저장 | 로컬 (수동) |
| `update-filing-prices.ts` | `guru-portfolios.json`의 각 보유 종목에 공시일 종가(`price_at_filing`) 추가 (KIS API 사용, 로컬 dev 서버 필요) | 로컬 (수동) |
| `github-update-prices.ts` | 게시글 종목 현재가 일괄 업데이트 → `feed.json` 저장. `MARKET_TYPE`(ASIA/US/ALL)으로 거래소 필터링 | GitHub Actions 크론 (15분) |
| `github-update-guru-prices.ts` | 구루 포트폴리오 현재가 업데이트 → `guru-stock-prices.json` 저장 | GitHub Actions 크론 (미장 마감 후 1회) |
| `local-price-updater.ts` | 로컬 PC 상주형 가격 업데이트 스케줄러 (아시아장/미국장/암호화폐 시간대별) | 로컬 (상시 실행) |

## 공통 환경변수

- `FIREBASE_SERVICE_ACCOUNT_BASE64` — Firebase Admin SDK 서비스 계정 (base64)
- 또는 `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` + `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` — Storage 버킷명

`.env.local`에서 자동 로드됨.

## 실행 방법

```bash
# ts-node (Firebase Admin 사용 스크립트)
npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/<파일명>.ts

# tsx (HTTP/파일 시스템만 사용하는 스크립트)
npx tsx scripts/<파일명>.ts
```
