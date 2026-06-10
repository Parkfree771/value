/**
 * 가상 사용자 생성 스크립트 (Supabase 버전)
 *
 * 일반 회원가입 흐름을 거치지 않고 백엔드에서 가상 사용자를 만든다.
 * - auth.users 에 createUser (이메일은 가짜, 영구 ban 으로 로그인 차단)
 * - public.users 보정 (트리거 기본값 → 우리가 원하는 닉네임/플래그)
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
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY    (service-role)
 */

import { createClient } from '@supabase/supabase-js';
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('환경변수 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 누락');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const APPLY = process.argv.includes('--apply');

function genPassword(): string {
  return (
    'V!' +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2).toUpperCase() +
    Date.now()
  );
}

async function findByNickname(nickname: string): Promise<{ id: string; email: string | null } | null> {
  const { data, error } = await sb
    .from('users')
    .select('id, email')
    .eq('nickname', nickname)
    .maybeSingle();
  if (error) {
    console.error(`  ✗ 닉네임 조회 실패 (${nickname}):`, error.message);
    return null;
  }
  return data ?? null;
}

async function findByEmail(email: string): Promise<{ id: string; nickname: string | null } | null> {
  const { data, error } = await sb
    .from('users')
    .select('id, nickname')
    .eq('email', email)
    .maybeSingle();
  if (error) return null;
  return data ?? null;
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

  // auth.users 생성
  const { data: created, error: cErr } = await sb.auth.admin.createUser({
    email,
    password: genPassword(),
    email_confirm: true,
    user_metadata: { virtual: true },
  });
  if (cErr || !created?.user) {
    console.error(`  ✗ createUser 실패 (${spec.nickname}):`, cErr?.message);
    return { id: null, status: 'fail' as const };
  }
  const uid = created.user.id;

  // 영구 ban — 가상 사용자는 로그인 차단
  const { error: bErr } = await sb.auth.admin.updateUserById(uid, {
    ban_duration: '876000h',
  });
  if (bErr) console.warn(`     ban 실패 (${uid}):`, bErr.message);

  // public.users 보정 — handle_new_user 트리거 기본값 정리.
  // ⚠ 모든 컬럼은 schema에 존재하는 것만! 없는 컬럼 한 개라도 끼면 UPDATE 전체가 실패함.
  const { error: uErr } = await sb
    .from('users')
    .update({
      nickname: spec.nickname,
      display_name: spec.display_name ?? spec.nickname,
      bio: spec.bio ?? null,
      onboarding_completed: true,
      terms_agreed: true,
      privacy_agreed: true,
      investment_disclaimer_agreed: true,
      is_virtual: true,
      is_admin: false,
    })
    .eq('id', uid);
  if (uErr) console.warn(`     public.users 보정 실패 (${uid}):`, uErr.message);

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
