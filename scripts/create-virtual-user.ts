/**
 * 가상 사용자 생성 스크립트 (Neon Postgres 버전)
 *
 * 일반 회원가입 흐름을 거치지 않고 백엔드에서 가상 사용자를 만든다.
 * - public.users 에 직접 INSERT (id = gen_random_uuid(), 이메일은 가짜)
 * - 인증 계정(Neon Auth)은 만들지 않음 — 가상 사용자는 로그인하지 않으므로 불필요하고,
 *   neon_auth 스키마는 관리형이라 직접 쓰면 안 됨. 인증 계정이 없으니 로그인 자체가 불가.
 * - is_virtual=true 로 표시되어 UI 에서 가상 작성자임이 구분 가능
 *
 * 사용법:
 *   1) 아래 NEW_USERS 편집
 *   2) dry-run (기본):
 *        npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/create-virtual-user.ts
 *   3) apply (실제 생성):
 *        npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/create-virtual-user.ts --apply
 *
 * 환경변수 (.env or .env.local):
 *   DATABASE_URL           (Neon Postgres 접속 문자열)
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

// ============================================================
// 여기서 편집하세요 — 만들 신규 가상 사용자 목록
// (email 생략하면 {nickname}@local.invalid 자동 사용)
// ============================================================
const NEW_USERS: Array<{
  nickname: string;
  email?: string;
  display_name?: string;
  bio?: string;
}> = [
  { nickname: 'MarketMaven' },
];
// ============================================================

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('환경변수 DATABASE_URL 누락');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const APPLY = process.argv.includes('--apply');

async function findByNickname(nickname: string): Promise<{ id: string; email: string | null } | null> {
  try {
    const rows = await sql`select id, email from users where nickname = ${nickname} limit 1`;
    return (rows[0] as { id: string; email: string | null } | undefined) ?? null;
  } catch (error) {
    console.error(`  ✗ 닉네임 조회 실패 (${nickname}):`, (error as Error).message);
    return null;
  }
}

async function findByEmail(email: string): Promise<{ id: string; nickname: string | null } | null> {
  try {
    const rows = await sql`select id, nickname from users where email = ${email} limit 1`;
    return (rows[0] as { id: string; nickname: string | null } | undefined) ?? null;
  } catch {
    return null;
  }
}

async function createOne(spec: { nickname: string; email?: string; display_name?: string; bio?: string }) {
  const email = spec.email ?? `${spec.nickname}@local.invalid`;

  // 사전 중복 체크
  const byNick = await findByNickname(spec.nickname);
  if (byNick) {
    console.log(`  ✓ 이미 존재 (nickname): ${spec.nickname} → ${byNick.id}`);
    return { id: byNick.id, status: 'skip' as const };
  }
  const byMail = await findByEmail(email);
  if (byMail) {
    console.warn(`  ⚠ 이메일 충돌: ${email} 은 닉네임 "${byMail.nickname}" 가 사용 중 → 스킵`);
    return { id: byMail.id, status: 'skip' as const };
  }

  if (!APPLY) {
    console.log(`  + (dry-run) 생성 예정: ${spec.nickname} (email: ${email})`);
    return { id: null, status: 'dry' as const };
  }

  // public.users 직접 INSERT — 인증 계정 없이 프로필 행만 생성 (가상 사용자는 로그인 안 함).
  // ⚠ 모든 컬럼은 schema에 존재하는 것만! 없는 컬럼 한 개라도 끼면 INSERT 전체가 실패함.
  let uid: string;
  try {
    const rows = await sql`
      insert into users (
        id, email, nickname, display_name, bio,
        onboarding_completed, terms_agreed, privacy_agreed, investment_disclaimer_agreed,
        is_virtual, is_admin
      ) values (
        gen_random_uuid(), ${email}, ${spec.nickname}, ${spec.display_name ?? spec.nickname}, ${spec.bio ?? null},
        true, true, true, true,
        true, false
      )
      returning id
    `;
    uid = rows[0].id as string;
  } catch (error) {
    console.error(`  ✗ public.users INSERT 실패 (${spec.nickname}):`, (error as Error).message);
    return { id: null, status: 'fail' as const };
  }

  console.log(`  + 생성: ${spec.nickname} → ${uid} (${email})`);
  return { id: uid, status: 'created' as const };
}

async function main() {
  console.log(
    `\n가상 사용자 생성 스크립트 ${APPLY ? '[APPLY 모드 — 실제 생성됨]' : '[DRY-RUN — 변경 없음]'}\n`,
  );

  if (NEW_USERS.length === 0) {
    console.log('NEW_USERS 가 비어 있습니다. 파일 상단 배열에 추가하세요.\n');
    return;
  }

  console.log(`${NEW_USERS.length}개 사용자 처리:`);
  const summary = { created: 0, skipped: 0, failed: 0, dry: 0 };
  for (const u of NEW_USERS) {
    const result = await createOne(u);
    if (result.status === 'created') summary.created++;
    else if (result.status === 'skip') summary.skipped++;
    else if (result.status === 'fail') summary.failed++;
    else if (result.status === 'dry') summary.dry++;
  }

  console.log(`\n결과: 생성 ${summary.created} / 스킵 ${summary.skipped} / 실패 ${summary.failed} / dry-run ${summary.dry}\n`);
  if (!APPLY) console.log('실제 생성하려면 --apply 플래그로 다시 실행하세요.\n');
}

main().catch((e) => {
  console.error('\n치명적 오류:', e);
  process.exit(1);
});
